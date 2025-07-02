# DevX Console

A developer experience platform that provides a landing page with optional sign-in functionality. The application works both with real authentication (via Keycloak) and with placeholder JWT tokens for testing.

## Features

🔐 **Flexible Authentication**
- Optional sign-in with Keycloak integration
- Works without authentication using placeholder tokens
- Seamless user experience for both authenticated and guest users

🚀 **Developer-Friendly**
- Copy JWT tokens instantly
- Ready-to-use API code snippets
- Beautiful, modern UI with responsive design

⚡ **Multiple Modes**
- **Authenticated Mode**: Real JWT tokens from Keycloak
- **Guest Mode**: Placeholder tokens for testing and development
- **Landing Page**: Beautiful welcome experience with clear options

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Usage

### Landing Page

When you first visit the application, you'll see a landing page with two options:

1. **Sign In with Keycloak**: Authenticate with your Keycloak account to get real JWT tokens
2. **Continue Without Sign In**: Use the application with placeholder tokens for testing

### Authenticated Mode

If you sign in, you'll get:
- Real JWT tokens from Keycloak
- Automatic token refresh
- Personalized user information
- Copy functionality for tokens and API snippets

### Guest Mode

If you continue without signing in, you'll get:
- Placeholder JWT tokens (safe for testing)
- Same UI and functionality as authenticated mode
- Clear indication that you're using test tokens
- Option to upgrade to real authentication

## Configuration

### Keycloak Configuration

The Keycloak configuration can be found in `src/components/FlexibleDevXConsole.tsx`:

```typescript
const keycloakConfig = {
  url: 'https://keycloak.eu-nordics-sto-test.dstny.d4sp.com/auth',
  realm: '40aa6bdb-11e5-49b7-8af8-6afe2111e514',
  clientId: 'sam',
};
```

Update these values to match your Keycloak setup.

## Project Structure

```
src/
├── components/
│   ├── LandingPage.tsx          # Main landing page component
│   ├── LandingPage.module.css   # Landing page styles
│   ├── FlexibleDevXConsole.tsx  # Console component with auth modes
│   ├── DevXConsole.tsx          # Original console component
│   └── DevXConsole.module.css   # Console styles
├── App.tsx                      # Main app component
├── App.css                      # Global app styles
└── index.tsx                    # Application entry point
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Runs the test suite
- `npm eject` - Ejects from Create React App (irreversible)

## Technologies Used

- **React 19** - Frontend framework
- **TypeScript** - Type safety
- **Keycloak** - Authentication and authorization
- **CSS Modules** - Scoped styling
- **React Keycloak** - Keycloak integration for React

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.