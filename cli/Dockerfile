# Use an official Node.js runtime as the base image
FROM node:lts-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the project files to the working directory
COPY . .

# Build the TypeScript code
RUN npm run build
RUN npm install -g .

# Defaults to outputting the CLI help
CMD [ "semgrep-azdevops", "--help" ]