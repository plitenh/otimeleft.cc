# Nix EDA toolchain

用 Nix 锁定 Magic、Netgen、KLayout、OpenROAD 等 EDA 工具，消除环境漂移。

- 工具二进制由内容哈希标识。
- 同一份 flake lock 在不同机器上产生相同工具链。
- 可组合进 `devShell`，作为 signoff / DRC / LVS 的可复现环境。
