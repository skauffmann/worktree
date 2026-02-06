# [1.13.0](https://github.com/skauffmann/worktree/compare/v1.12.0...v1.13.0) (2026-02-06)


### Features

* add editor preference in configuration ([#29](https://github.com/skauffmann/worktree/issues/29)) ([bf7f425](https://github.com/skauffmann/worktree/commit/bf7f42584db7865c3098e35960ab99c8f39c43b7))

# [1.12.0](https://github.com/skauffmann/worktree/compare/v1.11.0...v1.12.0) (2026-02-04)


### Features

* run afterScripts before opening terminal and editor ([#28](https://github.com/skauffmann/worktree/issues/28)) ([8e7dcab](https://github.com/skauffmann/worktree/commit/8e7dcab5d0e38a6b99e851314e9231078e22915b))

# [1.11.0](https://github.com/skauffmann/worktree/compare/v1.10.0...v1.11.0) (2026-02-04)


### Features

* add afterScripts support in configuration ([#27](https://github.com/skauffmann/worktree/issues/27)) ([51a4767](https://github.com/skauffmann/worktree/commit/51a4767768cae545783e71b2f6ecd6f7e1ce9620))

# [1.10.0](https://github.com/skauffmann/worktree/compare/v1.9.0...v1.10.0) (2026-01-30)


### Bug Fixes

* open terminal before editor to prevent focus stealing ([#25](https://github.com/skauffmann/worktree/issues/25)) ([56e2f36](https://github.com/skauffmann/worktree/commit/56e2f360eede2680b88dbd4410ecd347938732b5))


### Features

* install dependencies for multi-project repos ([#26](https://github.com/skauffmann/worktree/issues/26)) ([f20c6fe](https://github.com/skauffmann/worktree/commit/f20c6fee85661315e829808bb9d7017eb6f73bf3))

# [1.9.0](https://github.com/skauffmann/worktree/compare/v1.8.0...v1.9.0) (2026-01-28)


### Bug Fixes

* improve Ghostty terminal new tab support ([#23](https://github.com/skauffmann/worktree/issues/23)) ([63be776](https://github.com/skauffmann/worktree/commit/63be7762542e5bb289e0966bc9d28ca7f670dde6))


### Features

* add autocomplete suggestions for branch name input ([#24](https://github.com/skauffmann/worktree/issues/24)) ([ba5216a](https://github.com/skauffmann/worktree/commit/ba5216a5da3af883662ef8403b73ad82b8964a16))
* add support for tracking remote branches directly ([#21](https://github.com/skauffmann/worktree/issues/21)) ([4b2e32b](https://github.com/skauffmann/worktree/commit/4b2e32bdcab15f45e89a6894096b725e8c0a5b3b))
* migrate CLI from clack to Ink (React) ([#19](https://github.com/skauffmann/worktree/issues/19)) ([87fc5c1](https://github.com/skauffmann/worktree/commit/87fc5c1eb9d7f0a6dfc9abda52d4142ef214525e))
* move remote branch tracking question to batch config ([#22](https://github.com/skauffmann/worktree/issues/22)) ([b1a552e](https://github.com/skauffmann/worktree/commit/b1a552ecb10e4dc8624af1677cf0094e551287d8))

# [1.8.0](https://github.com/skauffmann/worktree/compare/v1.7.1...v1.8.0) (2026-01-23)


### Features

* add support for .gen file extension in generated files detection ([#17](https://github.com/skauffmann/worktree/issues/17)) ([986a44a](https://github.com/skauffmann/worktree/commit/986a44afe59a30482e3014ee8e60f96b63ecb285))

## [1.7.1](https://github.com/skauffmann/worktree/compare/v1.7.0...v1.7.1) (2026-01-23)


### Bug Fixes

* stop spinner after each project in multi-project dependency installation ([#16](https://github.com/skauffmann/worktree/issues/16)) ([8aafac4](https://github.com/skauffmann/worktree/commit/8aafac4dc6bd0b6af0a021b79f094170df009a0f))

# [1.7.0](https://github.com/skauffmann/worktree/compare/v1.6.0...v1.7.0) (2026-01-23)


### Features

* add multi-project package installation support ([#12](https://github.com/skauffmann/worktree/issues/12)) ([c611940](https://github.com/skauffmann/worktree/commit/c61194072b3a2653022906ac4277c4123f0bd664))
* add support for copying gitignored generated files to worktrees ([#14](https://github.com/skauffmann/worktree/issues/14)) ([c70e844](https://github.com/skauffmann/worktree/commit/c70e844702b487ac698b3efd4be46e3119a6ae19))

# [1.6.0](https://github.com/skauffmann/worktree/compare/v1.5.0...v1.6.0) (2026-01-22)


### Bug Fixes

* use npm as default package manager fallback ([2196b6b](https://github.com/skauffmann/worktree/commit/2196b6b7d9f8808f7a8601cdebb6587a55c282d4))


### Features

* add terminal title support for worktrees ([e5a5d12](https://github.com/skauffmann/worktree/commit/e5a5d1254a7385d99d55f3991b59e7fc04327f0c))
* add terminal title support for worktrees ([fd224c2](https://github.com/skauffmann/worktree/commit/fd224c2737ddc9005da90e4c192abe011da751aa))

# [1.5.0](https://github.com/skauffmann/worktree/compare/v1.4.0...v1.5.0) (2026-01-21)


### Features

* propagate branch name argument when creating worktree from existing worktree ([2435459](https://github.com/skauffmann/worktree/commit/2435459bafc7fd3a4aedd89e7c38163da0f6e476))

# [1.4.0](https://github.com/skauffmann/worktree/compare/v1.3.0...v1.4.0) (2026-01-21)


### Features

* add option to create new worktree from existing worktree ([058067b](https://github.com/skauffmann/worktree/commit/058067bbddc6d51cfe2d47e52b0f92f873c7dd66))

# [1.3.0](https://github.com/skauffmann/worktree/compare/v1.2.0...v1.3.0) (2026-01-21)


### Bug Fixes

* rename release binaries to avoid name conflicts ([921b14b](https://github.com/skauffmann/worktree/commit/921b14b6ca7c9866eb80cb8efceff4d3e888d386))


### Features

* add build step to CI workflow ([db4418c](https://github.com/skauffmann/worktree/commit/db4418cc0d12f2a0a4616fd1e03e4b2c9141e5a1))
* add CI workflow for pull request checks ([ac94767](https://github.com/skauffmann/worktree/commit/ac947678a568778f9f57df1b92270ef159e6735c))
* add git fetch before worktree creation ([793c8bf](https://github.com/skauffmann/worktree/commit/793c8bfe10413fec2125636c94494f68727d7f69))
* add option to open worktree in new terminal tab ([f9c6618](https://github.com/skauffmann/worktree/commit/f9c6618e6abd408a4582b4aa86ead5cf9a1f45ad))
* configure upstream tracking for new branches in createWorktree ([a4ec886](https://github.com/skauffmann/worktree/commit/a4ec88697235e3c1d7e6a847c7d8364cdd984dbd))
* default to opening worktree in new terminal tab ([5b9a324](https://github.com/skauffmann/worktree/commit/5b9a3246b46fc4843990738250a19f25e116e6ea))

# [1.2.0](https://github.com/skauffmann/worktree/compare/v1.1.0...v1.2.0) (2026-01-20)


### Features

* ask for create worktree from origin/main ([03786f0](https://github.com/skauffmann/worktree/commit/03786f07bedfcd6c567fae76642eceb60d547f57))
* prefix worktree folder by repo name ([2bbbebc](https://github.com/skauffmann/worktree/commit/2bbbebc9586263995010426091e4d2e4d2fcbbcb))

# [1.1.0](https://github.com/skauffmann/worktree/compare/v1.0.5...v1.1.0) (2026-01-20)


### Features

* handle client version checking ([8526345](https://github.com/skauffmann/worktree/commit/8526345c57605bb4970e922eda29392043deb0d2))
