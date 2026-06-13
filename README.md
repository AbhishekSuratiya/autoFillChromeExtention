# JobFill – Auto-fill Job Applications

JobFill is a Chrome Browser Extension that allows you to store your professional profile once and auto-fill job application forms with a single click. It supports popular job boards and applicant tracking systems like Greenhouse, Lever, Workday, LinkedIn, and more.

Built with **React**, **TypeScript**, and **Vite**, using Chrome Extension **Manifest V3**.

## Features
- **One-Click Auto-Fill**: Instantly populate standard job application fields.
- **Secure Local Storage**: Uses Chrome's local storage to securely save your profile data.
- **Side Panel & Popup Support**: Easily access the tool from Chrome's side panel or the extension popup.
- **Extensible**: Designed to easily add new auto-fill fields and support new application platforms.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or another package manager

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd auto-fill-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   To build the project for production (which generates the extension files into the `dist` folder), run:
   ```bash
   npm run build
   ```
   *Note: This command generates the required icons, compiles TypeScript, and builds both the React UI and the content scripts.*

## Loading the Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Turn on **Developer mode** using the toggle switch in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the `dist` folder located inside your cloned project directory.
5. JobFill should now appear in your list of installed extensions.

## Usage

1. **Configure Your Profile:**
   - Right-click the JobFill extension icon in your Chrome toolbar and select **Options**.
   - Fill in your personal details, work experience, links, and other required information, then save your profile.
   - **Optional:** To quickly test the extension, you can import the provided sample profile backup by uploading the [`jobfill_profile_backup.json`](file:///Users/abhishek/WebstormProjects/auto-fill-extension/jobfill_profile_backup.json) file directly from the options page.

2. **Auto-Fill Applications:**
   - Navigate to a supported job application page (e.g., a Greenhouse or Lever job post).
   - Click the JobFill extension icon or open it in the Chrome Side Panel.
   - Click the auto-fill button to populate the form fields with your saved profile data.

## Development

- Run `npm run dev` to start the Vite development server (useful for iterating on the UI pages like the options or popup pages).
- For making changes to the content script or background worker, you will need to run `npm run build` to generate the updated files in the `dist` folder, and then click the refresh icon on the extension card in `chrome://extensions/`.
- Run `npm run lint` to check for ESLint errors.

## Contributing / Adding New Fields

If you want to extend the auto-fill capabilities by adding new fields, please refer to the detailed guide:
- [Adding a New Field](ADDING_A_NEW_FIELD.md)
