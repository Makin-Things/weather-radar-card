# Contributing to Weather Radar Card

Thank you for your interest in contributing to Weather Radar Card! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 20 or higher (see `.nvmrc`)
- npm
- A Home Assistant instance for testing

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/weather-radar-card.git
   cd weather-radar-card
   ```

3. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

4. Start development server:
   ```bash
   npm start
   ```
   This will start a development server on port 5000 with hot-reload.

5. Build for production:
   ```bash
   npm run build
   ```

### Testing Your Changes

1. Copy the built file to your Home Assistant instance:
   ```bash
   cp dist/weather-radar-card.js /path/to/homeassistant/config/www/
   ```

2. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+F5)

3. Check the browser console (F12) for any errors

## Code Style

- This project uses ESLint and Prettier for code formatting
- Run `npm run lint` before committing
- Follow existing code patterns and conventions
- Write clear, descriptive commit messages

## Pull Request Process

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test thoroughly

3. Update documentation if needed (README.md, CHANGELOG.md)

4. Commit your changes:
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a Pull Request on GitHub

### Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure all tests pass (npm run build succeeds)
- Keep PRs focused on a single feature or fix

## Reporting Bugs

When reporting bugs, please include:

- Home Assistant version
- Card version
- Browser and version
- Console errors (F12 in browser)
- Minimal configuration to reproduce the issue
- Steps to reproduce

## Feature Requests

We welcome feature requests! Please:

- Check existing issues first to avoid duplicates
- Describe the use case clearly
- Explain why this feature would be useful
- Be open to discussion about implementation

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

## Questions?

If you have questions about contributing, feel free to:

- Open a GitHub issue with the "question" label
- Check existing documentation and issues

Thank you for contributing!
