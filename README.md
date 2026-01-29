# Guardian AI - Frontend Prototype

This is a React + TypeScript web application implementing the frontend design for the Guardian AI Disaster Assistant.

## Prerequisites

You need **Node.js** installed on your machine to run this project.
Download it here: [https://nodejs.org/](https://nodejs.org/)

## Setup Instructions

1.  Open a terminal in this directory:
    ```bash
    cd guardian-ai-web
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser to the URL shown (usually `http://localhost:5173`).

## Features Implemented

*   **Mobile-First Design**: Mimics the iOS interface with a dark, glassmorphism theme.
*   **Interactive Map**: Uses MapLibre GL JS to render the city map.
*   **Critical Alerts**: "Wildfire", "Flood", and "Earthquake" scenarios included.
*   **Status Dashboard**: Displays high-level metrics and action checklists.

## Configuration

*   **Dummy Data**: You can modify `src/data.ts` to change the active hazards or add new ones.
*   **Styles**: TailwindCSS is used for all styling in `src/index.css` and components.
