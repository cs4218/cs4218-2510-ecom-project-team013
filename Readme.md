# CS4218 Project - Virtual Vault

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:
   - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
   - Open your terminal and check the installed versions of Node.js and npm:

     ```bash
     node -v
     npm -v
     ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:
   - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:
   - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
   - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:
   - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
   - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:
   - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
   - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:
   - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
   - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
   - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**
   - Go to the GitHub repository of the MERN app.
   - Click on the "Code" button and copy the URL of the repository.
   - Open your terminal or command prompt.
   - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:

     ```bash
     git clone <repository_url>
     ```

   - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**
   - Run the following command in your project's root directory:

     ```bash
     npm install && cd client && npm install && cd ..
     ```

3. **Configure environment variables**
   - Copy the example environment variables from `.env.example` to `.env` in the project directory, then add the connection string copied from MongoDB Atlas, replacing the necessary placeholders:

     ```env
     MONGO_URL = <connection string>
     ```

   - Likewise, for the frontend, navigate to the `client` directory and copy `.env.example` to `.env` and set any necessary environment variables there.

     ```bash
     cd client
     cp .env.example .env
     cd ..
     ```

4. **Adding sample data to database**
   - Download “Sample DB Schema” from Canvas and extract it.
   - In MongoDB Compass, create a database named `test` under your cluster.
   - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
   - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
   - Open your web browser.
   - Use `npm run dev` to run the app from root directory, which starts the development server.
   - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

   ```bash
   npm install --save-dev jest

   ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:
   - **Frontend tests**

     ```bash
     npm run test:frontend
     ```

   - **Backend tests**

     ```bash
     npm run test:backend
     ```

   - **All the tests**

     ```bash
     npm run test
     ```

## 6. Continuous Integration (CI)

This project uses GitHub Actions to automate code quality and testing workflows.

1. Branch Check: <https://github.com/cs4218/cs4218-2510-ecom-project-team013/actions/workflows/branch-check.yml>

   This ensures all pull requests follow a linear branching strategy.

2. Continuous Integration: <https://github.com/cs4218/cs4218-2510-ecom-project-team013/actions/workflows/ci.yml>

   This encompasses the bulk of the CI pipeline, running the following tasks in parallel:
   - Installs dependencies
   - Checks code format
   - Builds the project (as a sanity check)
   - Executes frontend & backend tests in parallel ([sample Jest run with coverage report](https://github.com/cs4218/cs4218-2510-ecom-project-team013/actions/runs/18266955286/job/52002765593))

## 7. Project Team

1. Dhiraputta Pathama Tengara ([@DhiraPT](https://github.com/DhiraPT))

   Overall contributions:
   - Designed and implemented unit testing strategy based on mock-driven isolation and security-focused validation principles.
   - Authored and maintained white-box tests for backend controllers and middleware, ensuring isolation from external dependencies like JWT and MongoDB.
   - Implemented security validation tests within middleware (e.g., authMiddleware) to verify adherence to authentication and authorization rules.
   - Ensured all tests conform to CI/CD integration standards and maintaining coverage thresholds.

   Key Areas of Ownership:
   - AdminMenu - frontend
   - authMiddleware - backend
   - authHelper - backend
   - relatedProductController - backend
   - updateCategoryController - backend

2. Ma Yuan ([@mamayuan](https://github.com/mamayuan))

   Overall Contributions:
   - Developed spec-driven, black-box unit tests focusing on observable outcomes and API/UI contract integrity.
   - Implemented deterministic mocks for axios, react-hot-toast, react-router, Ant Design (AntD) components, and database models.
   - Added defensive-path coverage for malformed payloads, missing parameters, and concurrency edge cases.
   - Conducted white-box integration testing (Jest + React Testing Library) and black-box UI testing (Playwright) for key user workflows.
   - Verified full data-fetch → render → navigation flows with real router contexts and deterministic async behavior.
   - Ensured test resilience to refactoring by decoupling from implementation details while maintaining complete behavioral validation.
   - Summarized overall test results and produced graphical test statistics for MS2 (71 total tests, 68 passed, 95.8 % pass rate).

   Key Areas of Ownership:
   - Frontend
     - `useCategory` Hook – verified category data loading and state updates.
     - Product Details page – validated API chaining, navigation, and stale-response protection (`ProductDetails.int.test.tsx`).
     - Create Product page – tested form interactions, file uploads, and submission logic (`CreateProduct.int.test.tsx`).
     - Create Category page – verified CRUD logic, modal UX, and toast feedback (`CreateCategory.int.test.tsx`).
   - Backend
     - `getSingleProductController`, `relatedProductController`, `productPhotoController`, `createProductController`
       – tested validation, slug generation, and DB persistence with `mongodb-memory-server`.
   - UI Tests (Playwright)
     - Admin Manage Category – validated CRUD consistency across table, navbar, and home filter.
     - Create Product – covered both success and negative input scenarios.
     - User Profile Update – verified editable fields and password validation behavior.
   - Testing Methodology
     - Deterministic async mocking for stable React state updates.
     - Accessibility-oriented selectors (`getByRole`, `getByLabelText`) for robust UI assertions.
     - Network-idle synchronization and test cleanup for repeatable Playwright runs.
     - Combined white-box integration and black-box UI validation to ensure end-to-end correctness.


3. Richard Dominick ([@RichDom2185](https://github.com/RichDom2185))

   Overall contributions:
   - Routing configurations
   - Route guards (private routes, admin routes)
   - Context-related custom hooks (auth, cart, search)
   - Categories page
   - Orders page
   - Category controller tests
   - Order controller tests

   Key Areas of Ownership:
   - routes.ts – frontend
   - PrivateRoute.tsx – frontend
   - AdminRoute.tsx – frontend
   - context/auth.tsx – frontend
   - context/cart.tsx – frontend
   - context/search.tsx – frontend
   - categoryController – backend
   - authController#getOrdersController – backend

4. Tan Jun Heng ([@Austintjh19](https://github.com/Austintjh19))

   Overall contributions:
   - Designed and executed comprehensive frontend and backend unit tests, ensuring high branch and statement coverage across product and category modules.
   - Implemented both white-box and black-box testing strategies.
   - Mocked all child/parent components and external dependencies (e.g., APIs, database services) to achieve complete test isolation.
   - Identified and resolved multiple UI and API inconsistencies, contributing to cleaner, more maintainable code and standardized error handling.

   Key Areas of Ownership:
   - Product.tsx – frontend
   - CategoryProduct.tsx – frontend
   - UpdateProduct.tsx – frontend
   - CategoryForm.tsx – frontend
   - getProductController – backend
   - productCategoryController – backend
   - productPhotoController – backend
   - getSingleProductController – backend
   - deleteProductController – backend
   - updateProductController – backend

## 8. AI Tool Declataion

Use of Artificial Intelligence Tool were used throughout the development and documentation process to enhance productivity, accuracy, and clarity.

Notable use of AI Tool include:

- Assisted in generating repetitive or pattern-based unit test cases
- Used to clarify complex library behavior and framework internals (e.g., Mongoose query chaining, React hooks behavior) to accelerate understanding.
- Assisted in drafting, refining, and improving readability of README and Milestone Report
- Occasionally used for generating scaffolding or template code segments (e.g., Jest mock setups, API stubs) which were subsequently reviewed and customized.
