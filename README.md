# Endurance Training App

An app designed to help athletes track and log endurance-focused training plans. This project connects to Google Sheets to store and manage training data, leveraging TypeScript and Next.js.

## Prerequisites

Before setting up the project, ensure you have the following:

- **Node.js** (https://nodejs.org/)
- **Git** (https://git-scm.com/)
- **Google Cloud account** with access to create projects and enable APIs
- **Google Sheets API enabled** on Google Cloud

## Project Setup

### 1. Clone the Repository

Clone this repository to your local machine:

```bash
git clone <repository-url>
cd endurance-training-app

2. Install Dependencies

Install the necessary Node.js packages:

bash

npm install

3. Google Sheets API Setup

    Go to the Google Cloud Console.
    Create a new project (or select an existing one).
    Enable the Google Sheets API for your project.
    Create OAuth 2.0 credentials:
        Go to APIs & Services > Credentials.
        Click on Create Credentials and select OAuth client ID.
        Choose Desktop app as the Application type (necessary for local development).
        Download the credentials JSON file and save it as credentials.json in the root directory of this project.
    Share your Google Sheets file with the email from client_email in credentials.json to grant access.

4. Running the Project
Populate Google Sheets with Sample Data

To authenticate and populate Google Sheets with sample data, run the following command:

bash

npx ts-node src/scripts/setup-sheets.ts

If you’re prompted to authorize, follow the link provided in the terminal and paste the authorization code back into the terminal.
Start the Development Server

To start the local server, run:

bash

npm run dev

The app will be available at http://localhost:3000.
Project Structure

    credentials.json: Stores Google Sheets API credentials (do not share this file).
    token.json: Stores OAuth token after user authorization.
    src/scripts/setup-sheets.ts: Script for Google Sheets interaction, including authorization and data population.
