<div align="center">
<img width="800" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This repository contains everything you need to run your AI Studio application locally and deploy it to production.

**View your app in AI Studio:** https://ai.studio/apps/2479aa9e-3963-4fed-af0b-8d40d37d6064

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

- **Node.js** (v16.0.0 or higher recommended)
- **npm** (v8.0.0 or higher) or **yarn**
- A valid **Gemini API Key** (get one at https://ai.google.dev)

---

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd gclabs-automation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

   Or if you prefer yarn:
   ```bash
   yarn install
   ```

---

## Configuration

1. **Create environment file:**
   Copy `.env.local.example` to `.env.local` (if an example file exists):
   ```bash
   cp .env.local.example .env.local
   ```

2. **Set your Gemini API Key:**
   Open `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

   You can obtain your API key from [Google AI Studio](https://ai.google.dev).

3. **(Optional) Configure additional environment variables:**
   See the `.env.local` file for other configurable options.

---

## Running Locally

Start the development server:

```bash
npm run dev
```

Or with yarn:
```bash
yarn dev
```

The app will be available at `http://localhost:3000` (or the port specified in your configuration).

### Hot Reload
The development server supports hot module replacement (HMR), so changes to your code will be reflected in the browser automatically.

---

## Building for Production

Create an optimized production build:

```bash
npm run build
```

Or with yarn:
```bash
yarn build
```

This will generate a compiled version ready for deployment.

### Running Production Build Locally

To test the production build locally:

```bash
npm run build
npm run start
```

---

## Deployment

### Deploy to Google Cloud (Recommended)

1. **Install Google Cloud CLI:**
   Follow [these instructions](https://cloud.google.com/sdk/docs/install)

2. **Authenticate:**
   ```bash
   gcloud auth login
   ```

3. **Deploy:**
   ```bash
   gcloud app deploy
   ```

### Deploy to Other Platforms

This app can also be deployed to:
- **Vercel:** `vercel`
- **Netlify:** Push to main branch (if connected)
- **Heroku:** `git push heroku main`
- **Docker:** See Dockerfile in repository (if available)

---

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, specify a different port:
```bash
npm run dev -- --port 3001
```

### API Key Issues

- **Invalid API Key Error:** Verify your API key is correctly set in `.env.local`
- **Missing API Key:** Ensure `GEMINI_API_KEY` is defined in your environment variables
- **Rate Limiting:** Check your API quota at [Google Cloud Console](https://console.cloud.google.com)

### Dependency Issues

If you encounter dependency conflicts:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

Clear the build cache:
```bash
npm run clean  # if available
npm install
npm run build
```

---

## Project Structure

```
gclabs-automation/
├── src/                    # Source code
├── public/                 # Static assets
├── .env.local              # Environment variables (DO NOT commit)
├── .env.local.example      # Example environment file
├── package.json            # Project dependencies
├── README.md               # This file
└── ...
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

---

## Security Notes

- **Never commit `.env.local`** - This file contains sensitive API keys
- Use `.env.local.example` to document required environment variables
- Rotate API keys regularly
- Use different API keys for development and production

---

## Useful Resources

- [Google AI Studio Documentation](https://ai.google.dev)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Node.js Documentation](https://nodejs.org/docs)

---

## Support

For issues or questions:
- Check the [Google AI Studio Help](https://ai.google.dev/help)
- Review GitHub Issues in this repository
- Contact support through your Google account

---

## License

[Add your license information here]

---

**Happy coding!** 🚀
