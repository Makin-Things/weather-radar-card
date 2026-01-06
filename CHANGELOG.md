# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2026-01-05

### Changed
- **CRITICAL**: Replaced deprecated Rollup build plugins with modern @rollup/* equivalents
  - Migrated from rollup-plugin-babel to @rollup/plugin-babel
  - Migrated from rollup-plugin-commonjs to @rollup/plugin-commonjs
  - Migrated from rollup-plugin-node-resolve to @rollup/plugin-node-resolve
- Updated build tooling to latest versions
  - Rollup: 2.79.1 → 4.31.0
  - TypeScript: 4.8.3 → 5.7.3
  - ESLint: 7.32.0 → 8.57.1
  - Prettier: 2.7.1 → 3.4.2
  - @rollup/plugin-json: 4.1.0 → 6.1.0
  - @rollup/plugin-terser: 0.4.4 (replaces rollup-plugin-terser)
  - @typescript-eslint packages: 5.38.1 → 8.19.1
- Updated framework dependencies
  - Lit: 2.2.2 → 3.3.2
  - home-assistant-js-websocket: 5.11.1 → 9.4.0
- Migrated to ES modules (added "type": "module" to package.json)
- Renamed .eslintrc.js to .eslintrc.cjs for CommonJS compatibility

### Fixed
- Performance: Fixed shouldUpdate() to use proper change detection instead of always returning true
- Security: Added JSON.stringify() to all config value injections to prevent potential template injection
- Build: Added proper ES module imports with .js extensions for Rollup 4.x compatibility
- Build: Added createRequire for require.resolve() usage in ES modules

### Security
- Zero vulnerabilities detected after dependency updates
- Improved security with proper escaping of configuration values in iframe templates

## [2.1.1] - 2024

### Added
- Entity attribute support for dynamic coordinate tracking
- Mobile device detection for coordinate overrides
- Configurable height and width options for the card

### Changed
- Updated maintainer information (John Pettitt)

## [2.1.0] - 2022-09-14

### Fixed
- Fixed compatibility with Home Assistant 2022.11 breaking changes
- Updated Leaflet to 1.9.1

## [2.0.4] - 2022

### Added
- Imperial units support - card displays miles in scale when HA is set to imperial
- Extra attribution links in footer
- Card title support

### Fixed
- Map style exception handling
- Attribution links

### Changed
- Updated default location and zoom level
- Removed radar locations and geofence features

## Earlier Versions

For changes in versions prior to 2.0.4, please refer to the git commit history.

[Unreleased]: https://github.com/jpettitt/weather-radar-card/compare/v2.1.1...HEAD
[2.2.0]: https://github.com/jpettitt/weather-radar-card/compare/v2.1.1...v2.2.0
[2.1.1]: https://github.com/jpettitt/weather-radar-card/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/jpettitt/weather-radar-card/compare/v2.0.4...v2.1.0
[2.0.4]: https://github.com/jpettitt/weather-radar-card/releases/tag/v2.0.4
