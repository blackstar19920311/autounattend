# Windows Autounattend XML Generator

![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

A modern, fast, and user-friendly web application to generate custom `autounattend.xml` files for automated Windows installations. This tool simplifies the process of creating unattended Windows setup answer files with a sleek graphical interface.

## 🚀 Live Demo

You can access the live version of this application here:
- **[Primary: Cloudflare Pages](https://autounattend.pages.dev/)**
- **[Mirror: GitHub Pages](https://blackstar19920311.github.io/autounattend/)**

*(Both environments are automatically synced and deployed via GitHub Actions.)*

## ✨ Features

- **Modern UI:** Built with React for a seamless, interactive user experience.
- **Fast Build Times:** Powered by Vite for lightning-fast local development and optimized production builds.
- **Automated CI/CD Pipeline:** Fully automated deployments to both Cloudflare and GitHub Pages upon every commit to the `main` branch.
- **No Backend Required:** Completely client-side generation for maximum privacy and speed.

## 💻 Getting Started (Local Development)

If you want to run or modify this project locally, follow these steps:

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/blackstar19920311/autounattend.git
   ```
2. **Navigate to the project directory:**
   ```bash
   cd autounattend
   ```
3. **Install the dependencies:**
   ```bash
   npm install
   ```

### Running the App

Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Building for Production

To create a production-ready build in the `dist` folder:
```bash
npm run build
```

## 🛠️ Built With

- **[React](https://react.dev/)** - The UI library
- **[Vite](https://vitejs.dev/)** - Next Generation Frontend Tooling
- **[Cloudflare Workers & Pages](https://pages.cloudflare.com/)** - Hosting & Deployment

## 📄 License

This project is open-source and available for everyone. Feel free to fork, modify, and improve it!
