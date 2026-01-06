# Node Web Server

This project is a simple Node.js web server that serves a static HTML page without a database connection.

## Project Structure

```
node-web-server
├── public
│   └── index.html       # The HTML file served to users
├── src
│   └── server.js        # The entry point of the application
├── .gitignore            # Specifies files to ignore in Git
├── package.json          # Configuration file for npm
└── README.md             # Documentation for the project
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node package manager)

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:

   ```
   cd node-web-server
   ```

3. Install the dependencies:

   ```
   npm install
   ```

### Running the Server

To start the server, run the following command:

```
node src/server.js
```

The server will start and listen on `http://localhost:3000`. You can access the web page by navigating to this URL in your browser.

### Project Details

- The server serves a static HTML file located in the `public` directory.
- The project does not connect to any databases, making it lightweight and easy to deploy.

### License

This project is licensed under the MIT License.