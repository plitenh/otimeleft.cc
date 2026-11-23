# FreeBSD 构建、验证与 MM/Jail 实验手册

> 从交叉构建开始，经过 QEMU、ATF/Kyua 与 GDB 验证，再评估 NixBSD 和容器化开发环境，最后回到更适合内核研究的 KVM+QEMU+GDB 主线。
>
> 本文区分五种状态：**已实测**、**仅源码审查**、**未验证**、**暂停**与**未开始**。命令中的路径变量需要读者按自己的工作区设置，不代表某台真实机器上的目录。

## 0.build on nixos

### 0.1 先划清宿主与目标的边界

在非 FreeBSD 系统上构建 FreeBSD，最重要的不是把宿主机变成 FreeBSD，而是把宿主工具、目标文件和运行环境分开。

本文的已验证路径是：

```text
NixOS host
└── Ubuntu 24.04 build container
    ├── Clang/LLD 20
    ├── FreeBSD source
    ├── external object directory
    └── world + GENERIC kernel + release image
         ↓
      QEMU guest
```

NixOS 在这里提供容器、QEMU 和调试工具。**成功的是 NixOS 宿主上的 Ubuntu 容器交叉构建，不是原生 NixOS 构建。** 原生路径曾遇到非 FHS 布局问题，但一次失败不足以证明它永远不可行，因此本文不提供“原生 NixOS 已成功”的复现承诺。

整个流程只围绕三个问题展开：

1. 如何得到一组可信的 world 和 kernel；
2. 如何把安装结果变成可检查、可启动的磁盘；
3. 如何保留证据，而不是只相信构建命令的退出码。

### 0.2 工作区是一组约定，不是一份环境清单

下面的变量贯穿本章：

```sh
export WORK="$PWD"
export SRC="$WORK/src"
export OBJ="$WORK/obj"
export IMAGES="$WORK/images"
export BUILDER=freebsd-src-builder:ubuntu24.04
export JOBS=4

mkdir -p "$OBJ" "$IMAGES"
```

建议让源码、对象和镜像彼此独立：

```text
WORK/
├── src/       # FreeBSD source
├── obj/       # bmake、world、kernel 和 release 对象
├── images/    # raw 与 qcow2
└── docker/    # builder 定义和 VM release 配置
```

外部对象目录的价值不仅是保持源码树整洁。它还让干净构建、增量构建和不同工具链之间的隔离变得可操作。不要用来源不明的对象目录拼接一个新结果。

获取并固定源码：

```sh
git clone https://github.com/freebsd/freebsd-src.git "$SRC"
git -C "$SRC" checkout --detach \
    e6baf4c7430d9def848f70e6be7934e8c3df15a0

git -C "$SRC" status --short
git -C "$SRC" log -1 --oneline
```

固定提交使“源码是否变化”成为一个明确问题。已有工作区不要直接覆盖 clone，也不要为了复现而丢弃本地修改。

### 0.3 工具链：真正需要解释的是 Clang

交叉构建会涉及许多宿主工具，但多数只是构建器的实现细节。对这个源码快照而言，值得单独讨论的是 **Clang/LLD 的版本**。

`__is_nothrow_convertible` 内建支持问题出现在较旧工具链的 libc++ C++23 路径中。已实测的完整构建改用 Clang/LLD 20 后，world 和 kernel 均完成构建。这不是通过修改 FreeBSD 源码绕过问题，而是让编译器满足源码当时的需要。

这里有一条比版本号更通用的规则：

> 切换编译器后，不要沿用旧对象目录做“增量验证”。

旧对象可能隐藏头文件、内建函数或链接行为的变化。首次构建和工具链切换使用 `--clean`；只有相同源码、相同工具链和相同配置下才使用 `--no-clean`。

构建镜像后，先检查真正会被调用的工具：

```sh
docker build --pull=false -t "$BUILDER" "$WORK/docker"

docker run --rm "$BUILDER" bash -c '
    clang-20 --version
    ld.lld-20 --version
    bmake -V MAKE_VERSION
    python3 --version
'
```

版本检查不是装饰。它防止镜像标签与实际工具链脱节。

### 0.4 world 与 kernel

FreeBSD 为交叉构建提供 `tools/build/make.py`。它负责自举 bmake、设置交叉工具链并建立目标构建环境，不应简单替换为宿主 GNU make。

首次构建：

```sh
docker run --rm --name freebsd-src-build \
    --user "$(id -u):$(id -g)" \
    -v "$SRC:/work/src" \
    -v "$OBJ:/work/obj" \
    -w /work/src \
    -e MAKEOBJDIRPREFIX=/work/obj \
    "$BUILDER" \
    ./tools/build/make.py \
        --debug \
        --clean \
        --cross-bindir=/usr/lib/llvm-20/bin \
        TARGET=amd64 \
        TARGET_ARCH=amd64 \
        KERNCONF=GENERIC \
        -DWITH_DISK_IMAGE_TOOLS_BOOTSTRAP \
        buildworld buildkernel \
        -s -j"$JOBS"
```

几个参数构成了构建的骨架：

| 参数 | 作用 |
|---|---|
| `MAKEOBJDIRPREFIX` | 把对象放到源码树外 |
| `TARGET` / `TARGET_ARCH` | 选择目标机器和 ABI |
| `KERNCONF` | 选择内核配置 |
| `--cross-bindir` | 固定交叉 Clang/LLD 入口 |
| `-DWITH_DISK_IMAGE_TOOLS_BOOTSTRAP` | 自举后续组盘所需工具 |

相同条件下增量重建时，把 `--clean` 改为 `--no-clean`。不要把增量构建当作工具链变化后的干净验证。

### 0.5 从安装树到磁盘镜像

release 流程会再次设置环境。容器内需要显式恢复自举工具路径，避免脚本重置 `PATH` 后找不到刚刚构建的工具：

```sh
OBJROOT=/work/obj/work/src/amd64.amd64
BUILD_PATH=/work/obj/bmake-install/bin
BUILD_PATH="$BUILD_PATH:$OBJROOT/tmp/bin:$OBJROOT/tmp/usr/sbin"
BUILD_PATH="$BUILD_PATH:$OBJROOT/tmp/usr/bin:$OBJROOT/tmp/legacy/usr/sbin"
BUILD_PATH="$BUILD_PATH:$OBJROOT/tmp/legacy/usr/bin:$OBJROOT/tmp/legacy/bin"
BUILD_PATH="$BUILD_PATH:$OBJROOT/tmp/legacy/usr/libexec"
export FREEBSD_BUILD_PATH="$BUILD_PATH:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export PATH="$FREEBSD_BUILD_PATH"
```

下面的命令在 builder 内执行，调用 release 的 `vm-image` 路径：

```sh
./tools/build/make.py \
    --no-clean \
    --cross-bindir=/usr/lib/llvm-20/bin \
    TARGET=amd64 TARGET_ARCH=amd64 KERNCONF=GENERIC \
    -DWITH_DISK_IMAGE_TOOLS_BOOTSTRAP \
    -C /work/src/release \
    NOPKGBASE=1 NO_ROOT=1 WITHOUT_QEMU=1 PKG_CMD=true \
    -DWITH_VMIMAGES \
    VMFORMATS=raw VMFSLIST=ufs VMSIZE=5g SWAPSIZE=512m \
    VM_IMAGE_CONFIG=/work/docker/vm-qemu.conf \
    vm-image -s
```

`NO_ROOT` 和 METALOG 让安装树可以在非 root/chroot 条件下生成；`WITHOUT_QEMU` 避免在 Linux 构建机上执行目标 FreeBSD 二进制。测试镜像的账号和网络配置应只用于隔离环境，不要把空密码 root SSH 当成通用模板。

检查安装树，而不是立即相信镜像：

```sh
export STAGE="$OBJ/work/src/amd64.amd64/release/vm-image-raw-ufs"

test -x "$STAGE/bin/sh"
test -f "$STAGE/boot/kernel/kernel"
cat "$STAGE/etc/fstab"
```

### 0.6 退出码之后，还要检查产物

这个源码快照的 release 路径揭示了一个典型问题：某个组盘函数失败后，上层规则仍可能因 `|| true` 返回成功。于是出现“make 返回 0，却没有新镜像”的假成功。

因此验收至少应包含：

```sh
qemu-img info "$IMAGES/freebsd-main-amd64.raw"
fdisk -l "$IMAGES/freebsd-main-amd64.raw"
```

如果需要手工恢复组盘，应先理解 `vmimage.subr` 的状态和 `DESTDIR`，而不是重复执行整个 release。尤其注意：

- `MAKEOBJDIRPREFIX` 必须与构建时一致；
- `vm_create_disk` 会修改 `fstab`；
- 已有 ESP 记录时不要对同一安装树重复组盘；
- 恢复失败时保留安装树和日志，避免叠加第二次修改。

转换为 qcow2：

```sh
qemu-img convert -p -f raw -O qcow2 \
    "$IMAGES/freebsd-main-amd64.raw" \
    "$IMAGES/freebsd-main-amd64.qcow2"

qemu-img info "$IMAGES/freebsd-main-amd64.qcow2"
qemu-img check "$IMAGES/freebsd-main-amd64.qcow2"
```

同名文件可能已经是有价值的旧镜像，转换前应另行备份。`qemu-img check` 的结果和实际启动是两类证据，不能互相替代。

### 0.7 本章验收边界

**已实测：** 固定提交的 world、GENERIC kernel、raw/qcow2 生成，以及后续 QEMU 启动。

**未验证：** 原生 NixOS 构建、KVM 启动和当前快照之外的一般性结论。

构建章最终应交付的不是一串命令，而是一组可以被下一章消费的对象：源码提交、内核符号、安装树、可启动磁盘，以及它们之间明确的对应关系。

## 1.atf bsd

### 1.1 验证不是启动画面之后的一句“能进系统”

内核开发需要一套可重复的观察方法。本文把验证环境拆成四个接口：

| 接口 | 职责 |
|---|---|
| Serial | 启动日志、登录、ATF/Kyua 和 guest 内状态 |
| QMP | QEMU 运行状态与生命周期 |
| GDB stub | vCPU 寄存器、内核指令和符号 |
| qcow2 snapshot | 把实验写入限制在临时层 |

这四个接口回答的问题不同。串口正常不代表 QMP 可管理，QMP 显示 running 不代表 guest 没有内核错误，GDB 能写寄存器也不代表一次 fuzz 已经完成。

### 1.2 启动一个可丢弃的 VM

设置验证对象：

```sh
export IMAGE="$IMAGES/freebsd-main-amd64.qcow2"
export KERNEL_DEBUG="$OBJ/work/src/amd64.amd64/sys/GENERIC/kernel.debug"
export RUNDIR="$(mktemp -d /tmp/freebsd-verify.XXXXXX)"
chmod 700 "$RUNDIR"
```

启动：

```sh
qemu-system-x86_64 \
    -name freebsd-verify \
    -machine q35,accel=tcg \
    -cpu qemu64 \
    -smp 2 -m 2048 \
    -drive if=none,file="$IMAGE",format=qcow2,id=disk0 \
    -device virtio-blk-pci,drive=disk0 \
    -nic user,model=e1000 \
    -boot order=c \
    -display none -monitor none \
    -chardev socket,id=serial0,path="$RUNDIR/serial.sock",server=on,wait=off,logfile="$RUNDIR/serial.log" \
    -serial chardev:serial0 \
    -qmp unix:"$RUNDIR/qmp.sock",server=on,wait=off \
    -gdb unix:"$RUNDIR/gdb.sock",server=on,wait=off \
    -snapshot \
    -daemonize \
    -pidfile "$RUNDIR/qemu.pid" \
    -D "$RUNDIR/qemu.log"
```

`-snapshot` 是实验的默认保险。只有明确需要持久修改 guest 时才应移除它，而且每次只能有一个写实例使用基础磁盘。

有权限访问 `/dev/kvm` 的机器可以把 `accel=tcg` 换成 `accel=kvm`，并重新验证全部流程。**本文的实际寄存器与 ATF 结果来自 TCG，不把 KVM 写成已验证结果。**

### 1.3 QMP：先确认机器仍然受控

下面的小函数只依赖 Python 标准库，可用于查询和退出：

```sh
qmp() {
    python3 - "$RUNDIR/qmp.sock" "$@" <<'PY'
import json
import socket
import sys

s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.settimeout(10)
s.connect(sys.argv[1])
f = s.makefile("rwb", buffering=0)
print(f.readline().decode().strip())
for name in sys.argv[2:]:
    f.write((json.dumps({"execute": name}) + "\n").encode())
    print(f.readline().decode().strip())
s.close()
PY
}

qmp qmp_capabilities query-status query-version
```

健康检查至少要求 `query-status` 返回 `running=true`。测试结束后：

```sh
qmp qmp_capabilities quit
```

QMP 的 quit 结束的是 QEMU 进程；日常开发关机也可以先在 guest 内正常 shutdown，再清理宿主运行目录。

### 1.4 串口：按提示符同步，而不是盲目写入

串口自动化最容易犯的错误是一次写入大量命令。shell 尚未进入提示符时，后续输入可能拼接、丢失或落到错误程序中。

可靠的交互器应做到：

1. 等待 `login:`；
2. 登录后等待明确的 shell prompt；
3. 每发送一条命令，都等待下一条 prompt；
4. 超时后保存最后一段输出并失败退出；
5. 用唯一标记判断一组命令是否完成。

基础冒烟命令可以包括：

```sh
id
uname -a
freebsd-version
mount -p
cat -n /etc/fstab
ifconfig -l
jls
```

网络测试则先确认接口和地址，再测试网关或实际服务。没有配置 `hostfwd` 时，guest 内 sshd 正在运行并不意味着宿主可以直接 SSH。

### 1.5 GDB：让暂停位置对应正确的内核

只读检查：

```sh
gdb -q -nx -batch \
    -ex 'set architecture i386:x86-64' \
    -ex "symbol-file $KERNEL_DEBUG" \
    -ex 'set remotetimeout 10' \
    -ex "target remote $RUNDIR/gdb.sock" \
    -ex 'info address mi_startup' \
    -ex 'info registers rip rax rbx' \
    -ex 'x/4i $rip' \
    -ex 'detach'
```

符号文件必须与运行内核匹配。连接 remote target 会暂停 vCPU；`detach` 才会让它继续。寄存器值随暂停位置变化，不应与历史数值逐字比较。

如果需要观察 MM 或 jail 路径，可以先从符号开始：

```gdb
info address vm_fault
info address vm_fault_cow
info address prison_deref
```

能解析符号只是起点，不等于已经证明某次执行经过该函数。后者还需要断点、条件、调用栈和 guest 侧触发之间的对应证据。

### 1.6 可逆寄存器写入：验证通道，不制造结论

下面实验对 vCPU0 的 RAX 做一次 bit 0 XOR，随后立即恢复：

```sh
gdb -q -nx -batch \
    -ex 'set architecture i386:x86-64' \
    -ex 'set remotetimeout 10' \
    -ex "target remote $RUNDIR/gdb.sock" \
    -ex 'thread 1' \
    -ex 'set $saved_rax = $rax' \
    -ex 'set $injected_rax = $saved_rax ^ 0x1' \
    -ex 'set $rax = $injected_rax' \
    -ex 'set $injection_ok = ($rax == $injected_rax)' \
    -ex 'set $rax = $saved_rax' \
    -ex 'set $restore_ok = ($rax == $saved_rax)' \
    -ex 'printf "INJECTION_VERIFY=%d\n", $injection_ok' \
    -ex 'printf "RESTORE_VERIFY=%d\n", $restore_ok' \
    -ex 'detach'
```

两个标记都应为 1。之后再次查询 QMP，并在串口执行唯一标记：

```sh
qmp qmp_capabilities query-status
# guest shell 中：
echo __POST_GDB_OK__
```

**已实测：** RAX 写入、读回、恢复和 VM 继续运行。

这个实验只证明 GDB stub 的读写恢复通道可用。它没有选择内核故障点，没有控制触发时机，也没有生成输入语料，因此不是 fuzzing。任意寄存器修改都可能破坏内核状态，只能在隔离、可丢弃的 VM 中进行。

### 1.7 ATF 与 Kyua：测试程序和调度器各司其职

ATF 测试程序声明用例、元数据和断言；Kyua 读取 Kyuafile、隔离工作目录、调度执行并保存结果。

```text
test source
├── atf_test_case / atf_add_test_case
├── atf_set
├── atf_check
└── cleanup
        ↓
ATF runtime
        ↓
Kyua：调度、结果数据库和报告
```

常用操作：

```sh
cd /usr/tests/usr.sbin/jail

# ATF 程序自身的列表
./jail_basic_test -l

# Kyua 合并 Kyuafile 后的有效元数据
kyua list -v jail_basic_test

# 整个测试程序或单个用例
kyua test jail_basic_test
kyua test jail_basic_test:basic

# 输出详细通过记录
kyua report --verbose --results-filter=passed

# 失败时重新执行并直接查看输出
kyua debug jail_basic_test:basic
```

直接执行 ATF 程序不会获得 Kyua 的隔离和结果管理。会修改 jail、接口或文件系统的测试，不应在未隔离的真实系统上直接运行。

`atf_check` 默认要求退出码 0、stdout 和 stderr 为空。常用断言：

| 参数 | 含义 |
|---|---|
| `-s exit:0` / `-s not-exit:0` | 精确退出码或要求非零 |
| `-o empty` / `-e empty` | 输出必须为空 |
| `-o match:"regexp"` | 输出匹配正则 |
| `-o save:file` | 保存输出供后续检查 |
| `-r timeout` | 在期限内重试 |

### 1.8 jail_basic_test：结果和下一步同样重要

**已实测：** 在本文构建的 FreeBSD guest 中，`jail_basic_test` 七个用例全部通过，Kyua 退出码为 0。

| 用例 | 覆盖重点 |
|---|---|
| `basic` | 创建、查询、修改、重启和删除 |
| `commands` | 配置文件及生命周期钩子 |
| `jid_name_set` | JID/name 的设置与展开 |
| `list` | VNET、epair 和接口列表 |
| `nested` | 层级 jail、children.max 与权限限制 |
| `param_consistency` | 参数一致性和 poststop 环境 |
| `setaudit` | `allow.setaudit` 的行为 |

测试后的资源检查同样属于验收：

```sh
jls
ifconfig -l
```

历史结果中没有残留 jail 或测试接口。verbose 报告还出现了 `nestedjail not found` 的 cleanup 信息；它没有使测试失败，却提供了一个值得研究的生命周期问题。**一条非致命 stderr 既不是通过的反证，也不是内核回归的证据。**

**未验证：** 完整 `/usr/tests`、所有 jail 配置组合以及 Kyua jail `execenv`。

到这里，验证环境已经具备两种互补能力：ATF/Kyua 给出可重复的功能结果，QEMU/GDB 给出实现层的观察窗口。后续 MM 和 jail 研究应同时保留这两类证据。

## 2.trials: nixbsd on docker or qemu+kvm

### 2.1 试验的问题不是“能不能构建”，而是“能否自举开发环境”

一个成功产物并不自动成为好用的开发环境。构建环境可能擅长固定依赖和缓存，却不擅长启动目标系统；虚拟机能够运行目标内核，却需要额外管理镜像、符号和控制台。

本章比较三条路线：

1. Linux 容器中的 FreeBSD 交叉 builder；
2. Docker 中的 NixBSD builder 及其系统产物；
3. 传统 QEMU/KVM guest 中的 FreeBSD 开发。

重点放在环境边界和迭代成本。第 1 章已经给出的串口、QMP 和 GDB 操作不再重复。

### 2.2 Linux builder 解决了什么

FreeBSD 交叉 builder 把 Clang/LLD、bmake、自举工具和对象目录放进一个可重建环境。它适合：

- 固定宿主工具链；
- 重复 world/kernel 构建；
- 保留对象和 release 缓存；
- 避免污染宿主全局环境。

但 Docker 容器共享宿主内核。Linux builder 中的 Bash、Nix 或 Clang 是 Linux 程序，生成的 FreeBSD `/bin/sh` 不会因为“构建成功”就能在同一个容器中运行。

因此 builder 的优势是**构建隔离**，不是**目标运行时**。把源码挂载进容器也不会改变这一点。

### 2.3 NixBSD builder：把声明式构建引入试验

NixBSD 试验使用固定的上游提交：

```text
upstream: nix-community/nixbsd
commit:   fa821ab6c2a09dfb0411cbe52df25fe878b0f8b4
Nix:      2.31.2
```

该提交提供 `.#base.toplevel`、`.#base.vm` 等 flake 输出，但没有与本地试验相同的官方 Dockerfile、devShell 或 OCI Live 镜像。这里的镜像是本地 builder 定义，不是上游发布物。

它的目标被刻意限定为：

- 在 Linux 容器中提供 Nix；
- 固定 NixBSD 源码；
- 持久保存 `/nix` 和源码；
- 求值并构建 NixBSD 产物。

它从一开始就不是 NixBSD 用户态容器，也不负责启动 QEMU。

### 2.4 镜像固定与入口约束

一个可信的 builder 镜像应满足：

1. 基础镜像固定版本和 digest，不使用 `latest`；
2. 启用 `nix-command flakes`，不关闭 TLS、签名或 substituter 校验；
3. 构建时 clone 上游并 checkout 完整提交；
4. 用 `git rev-parse HEAD` 断言源码与预期完全一致；
5. 默认工作目录为 `/opt/nixbsd`；
6. entrypoint 使用 `exec "$@"` 转发命令，无参数时进入登录 shell。

构建和检查可以概括为：

```sh
export NIXBSD_IMAGE=nixbsd-live:fa821ab6
export NIXBSD_DOCKER="$WORK/trials/nixbsd-live"

docker build --pull=false -t "$NIXBSD_IMAGE" "$NIXBSD_DOCKER"

docker run --rm "$NIXBSD_IMAGE" bash -c '
    nix --version
    git --version
    git rev-parse HEAD
    nix config show experimental-features
'
```

这里的价值不在于容器标签，而在于**构建输入可解释**：镜像是哪一个版本、源码是哪一个提交、flake 特性是否开启，都可以在运行前检查。

### 2.5 两个持久卷，两种生命周期

试验中每次运行挂载两个命名卷：

```sh
docker run --rm -it --name nixbsd-live \
    --mount source=nixbsd-nix,target=/nix \
    --mount source=nixbsd-src-fa821ab6,target=/opt/nixbsd \
    "$NIXBSD_IMAGE"
```

| 卷 | 保存内容 |
|---|---|
| `nixbsd-nix` | Nix 工具、flake 输入、构建缓存和 store |
| `nixbsd-src-fa821ab6` | 固定源码、后续修改和 result/GC root |

这种拆分带来两个实际优势：

- 删除临时容器不会删除缓存；
- 重建镜像不会让旧源码卷悄悄覆盖新提交。

源码卷按提交命名很重要。镜像升级而卷名不变时，旧 `/opt/nixbsd` 可能掩盖镜像中刚固定的源码。`--rm` 不等于删除命名卷，真正的风险来自显式 volume 清理。

**已实测：** 临时容器重建后，两个卷的内容和源码提交仍可复用。

### 2.6 从求值到 dry-run：逐步扩大承诺

进入 builder 后，先读取 flake，而不是直接进行大型构建：

```sh
nix flake metadata . --no-write-lock-file

nix eval --no-write-lock-file \
    .#packages.x86_64-linux.base.toplevel.drvPath

nix build --dry-run --no-link --no-write-lock-file \
    .#base.toplevel
```

这三个步骤代表不同层次：

- metadata 证明 flake 输入和源码版本可读取；
- `drvPath` 证明目标可以求值；
- dry-run 证明 Nix 能生成构建计划。

dry-run 不会完成计划中的编译和下载，因此不能写成“系统已构建”。如果 flake 建议额外 substituter 或公钥，应先审查固定提交的 `nixConfig`，不要盲目使用 `--accept-flake-config`。

**已实测：** 上述 metadata、目标求值和 dry-run 均成功。

### 2.7 实际编译 toplevel

真正跨过“只有计划”边界的是：

```sh
nix build --no-write-lock-file \
    --max-jobs 4 --cores 4 -L \
    .#base.toplevel
```

**已实测：** `.#base.toplevel` 完整构建成功，输出目标为 `x86_64-freebsd`，并检查了以下结构：

```text
toplevel/
├── activate
├── init
├── kernel
├── etc
└── sw
```

`activate` 和 `init` 可执行，`kernel` 链接目标存在且非空；`init` 来自 FreeBSD `init-static`，`kernel` 来自带模块的内核输出。随后通过普通 `nix build` 建立持久 result/GC root，降低构建结果被垃圾回收的风险：

```sh
nix build --no-write-lock-file .#base.toplevel
```

这个 result 位于源码命名卷中。它证明一套 NixBSD 系统闭包已经形成，但仍不证明该闭包已经启动。

构建中断时，应使用同一组持久卷续建并以最终退出码和产物检查为准，不能根据日志末尾停在哪里猜测成功。

### 2.8 toplevel 之后，仍然隔着运行时

| 目标 | 本文状态 | 能得出的结论 |
|---|---|---|
| `.#base.toplevel` | 已实测构建 | 系统闭包可构建、结构可检查 |
| `.#base.vm` | 仅源码审查 | 上游存在 VM runner 路径 |
| `.#base.systemImage` | 仅源码审查 | 上游定义了 UEFI qcow2 生成逻辑 |
| NixBSD 用户态执行 | 未验证 | 不能由 toplevel 推断 |
| NixBSD ISO | 未提供 | 不能套用 FreeBSD disc1 安装流程 |
| NixBSD 物理安装 | 未验证 | 不具备实测安装结论 |

源码审查显示，VM 路线涉及 `vmClosureInfo`、OVMF、可写 CoW 磁盘和 EFI 变量；`systemImage` 是 GPT/ESP/UFS 的 qcow2，不是 ISO。上游还提示 VM 闭包可能消耗大量磁盘。

这些资料足以解释下一步可能是什么，却不足以写成操作结果。尤其是通用 `nixos-install` 文档中的 NixOS/ext4/GRUB 示例，不能直接冒充 NixBSD/FreeBSD 物理安装流程。

### 2.9 容器内 FreeBSD qcow2 安装

**状态：暂停，留空。**

容器封装 FreeBSD VM 的安装盘启动、完整安装和安装后持久启动没有完成。本章不补充安装成功结论，也不把 Live ISO 的启动记录当作安装记录。

### 2.10 最终选择：传统 KVM+QEMU+GDB

三条路线的优势并不相同：

| 路线 | 最强之处 | 主要代价 |
|---|---|---|
| Linux FreeBSD builder | 构建依赖固定、缓存稳定 | 不提供 FreeBSD runtime |
| Docker NixBSD builder | 声明式闭包、源码与 store 可持久化 | 构建与启动之间仍有较长链路 |
| KVM+QEMU+GDB | 直接控制内核、控制台和调试接口 | 需要自行管理镜像、符号和运行目录 |

对于 MM 和 jail 研究，主要迭代不是“再生成一次声明式系统”，而是：

```text
修改内核 → 启动 → 触发路径 → 观察 → 修改
```

传统虚拟化让这条链路更短。KVM 可用时还能减少 TCG 的执行开销；即使暂时没有 KVM，同一套 QEMU 控制面也可以先用 TCG 完成验证。

因此后续路线确定为：

> **放弃继续推进 NixBSD，把 Docker/Nix 留在构建试验记录中；MM 与 jail 开发回到传统 KVM+QEMU+GDB。**

这是一项路线选择，不是对 NixBSD 项目价值的否定，也不表示当前宿主已经验证 KVM。

## 3.real machine deployment

### 3.1 先识别介质格式

把虚拟机产物带到物理机之前，必须先确认自己拿的是什么：

| 格式 | 典型用途 | 不能混淆的地方 |
|---|---|---|
| ISO | 光盘/安装或 Live 介质 | 与 qcow2 的用途不同 |
| raw | 原始块设备内容 | 写入前必须确认完整磁盘布局 |
| qcow2 | QEMU 写时复制磁盘 | 不是可直接等同 ISO 的安装介质 |

转换格式只改变容器，不会自动增加固件支持。BIOS/UEFI、控制台、磁盘驱动和启动项仍需分别验证。

### 3.2 控制台必须适合目标机器

为 QEMU `-serial stdio` 制作的 Live ISO 可能包含：

```sh
console="comconsole"
comconsole_speed="115200"
boot_serial="YES"
```

这些设置适合串口自动化，却可能让物理显示器在后续启动阶段看不到安装器或 login。用于真实机器前，应根据硬件选择视频控制台或确认串口设备存在，不能把 QEMU 的可见性直接外推到物理机。

### 3.3 制作 USB：先确认整块设备，再写入

设置介质与目标变量：

```sh
export LIVE_ISO="$IMAGES/freebsd-live-amd64.iso"
export USB_DISK=/dev/CHANGE_ME
```

写入前至少完成以下人工检查：

1. `LIVE_ISO` 是预期文件并记录 SHA-256；
2. `USB_DISK` 是专门的、可整体清除的可移动块设备；
3. 目标是整块磁盘，不是其中一个分区；
4. 所有挂载自该设备的分区都已卸载；
5. 已再次确认内部系统盘不在目标中。

可用 `lsblk` 的型号、容量、传输类型和挂载点交叉确认，不要只依赖设备字母顺序。

写入与同步：

```sh
sudo dd if="$LIVE_ISO" of="$USB_DISK" \
    bs=4M status=progress oflag=sync conv=fsync
sync
```

按 ISO 长度逐字节比较，避免 U 盘尾部额外空间影响判断：

```sh
ISO_SIZE="$(stat -c %s "$LIVE_ISO")"
sudo cmp -n "$ISO_SIZE" "$LIVE_ISO" "$USB_DISK"
```

`cmp` 无差异输出才支持“已写入内容与 ISO 一致”。它仍不证明固件能够启动，也不证明安装到内部磁盘后能够运行。

### 3.4 当前证据边界

**已实测：** FreeBSD Live ISO 写入专用 SanDisk U 盘的整块设备，完成同步、逐字节比较和启动结构检查。

**未验证：**

- 物理机从该介质完整启动并进入 Live；
- 物理机硬件发现和网络；
- 安装到内部磁盘；
- 安装后的首次启动与持久使用。

近期围绕已有 ZFS 启动环境的排查，也不能替代上述 Live 介质验证。真机部署仍应把“介质制作成功”和“机器启动成功”分成两个验收点。

## 4.kernel eject and fuzz

**状态：尚未开始。**

后续范围只包括 FreeBSD **MM** 与 **jail**。NixBSD 不再进入研究队列，其他内核子系统也不通过全量 stress 间接带入。

开始之前需要建立以下门槛：

1. **隔离：** 所有 stress/fuzz 只在专用 FreeBSD guest 内执行，基础 qcow2 使用 `-snapshot`。
2. **范围：** stress2 只能逐脚本审查后进入 MM/jail allowlist，不能运行全量套件。
3. **边界：** 不连接宿主块设备、PCI 设备或可写共享；fuzz 默认 `-nic none`。
4. **时限：** 每轮有单命令和总超时，保留 serial/QMP/GDB 证据，并能独立清理。
5. **插桩：** GENERIC 不应被假定具有 KCOV；需要单独验证 KASAN/KCOV 内核和 `/dev/kcov`。
6. **结论：** 超时、panic、测试失败、cleanup 噪声和预期异常必须分类记录，不能混为“发现漏洞”。

第 1 章的可逆 RAX 实验只是 GDB 通道验证。真正的内核故障注入或 fuzz 还需要明确触发点、输入生成、覆盖反馈、状态恢复和结果分类。

在这些条件满足之前，本章保留为空白，不预先填写任何 crash、coverage 或漏洞结论。
