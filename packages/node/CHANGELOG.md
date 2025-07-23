# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [6.1.0] - 2025-07-23
### Changed
- Update to RPC Spec 0.8 (#31)
- Optimise docker image size (#32)

## [6.0.2] - 2025-07-01
### Changed
- Update `@subql/common` and `@subql/node-core` (#29)

## [6.0.1] - 2025-05-01
### Changed
- Update `@subql/node-core` with workers performance fix

## [6.0.0] - 2025-04-24
### Added
- Support for rewinds and unfinalized blocks with multichain projects

## [5.9.0] - 2025-03-05
### Changed
- Update @nestjs/event-emitter to compatible version with other nest dependencies (#25)
- Update `@subql/node-core` with fix for devnets (#26)

### Fixed
- Rate limit errors not correctly being detected (#25)

## [5.8.0] - 2025-02-27
### Changed
- Update `@subql/common` (#21)
- Update `@subql/node-core` an implement BlockchainService (#23)

### Fixed
- Dictionary network family being invalid (#21)
- Block finalization with devnets (#21)
- Transaction hash possibly being undefined (#22)

## [5.7.2] - 2025-02-03
### Fixed
- Fix previous release failed due to broken pipeline (#19)

## [5.7.1] - 2025-02-03
### Fixed
- Fix previous release failed

## [5.7.0] - 2025-02-03
### Added
- Init release

[Unreleased]: https://github.com/subquery/subql-starknet/compare/node-starknet/6.1.0...HEAD
[6.1.0]: https://github.com/subquery/subql-starknet/compare/node-starknet/6.0.2...node-starknet/6.1.0
[6.0.2]: https://github.com/subquery/subql-starknet/compare/node-starknet/6.0.1...node-starknet/6.0.2
[6.0.1]: https://github.com/subquery/subql-starknet/compare/node-starknet/6.0.0...node-starknet/6.0.1
[6.0.0]: https://github.com/subquery/subql-starknet/compare/node-starknet/5.9.0...node-starknet/6.0.0
[5.9.0]: https://github.com/subquery/subql-starknet/compare/node-starknet/5.8.0...node-starknet/5.9.0
[5.8.0]: https://github.com/subquery/subql-starknet/compare/node-starknet/5.7.2...node-starknet/5.8.0
[5.7.2]: https://github.com/subquery/subql-starknet/compare/node-starknet/5.7.1...node-starknet/5.7.2
[5.7.1]: https://github.com/subquery/subql-starknet/compare/node-starknet/5.7.0...node-starknet/5.7.1
[5.7.0]: https://github.com/subquery/subql-starknet/releases/tag/node-starknet/5.7.0
