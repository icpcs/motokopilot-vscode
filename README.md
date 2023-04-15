# MotokoPilot

MotokoPilot is a powerful VSCode extension that brings the capabilities of AI assisted developer tooling to the Motoko programming language. It is designed to assist developers in generating Motoko code from natural language instructions, generating documentation from Motoko code, as well as providing debugging and refactoring features. 

## Features

**Code generation**: The extension provides code generation from natural language instructions. This accelerates development by reducing the time spent on writing boilerplate code and assists in learning Motoko syntax and idioms.

**Documentation generation**: The extension can automatically generate documentation for functions, classes, and modules based on the code's structure and context. This encourages better code maintainability and readability, ultimately benefiting the entire development team.

**Debugging and refactoring** (WIP): The extension aids in identifying potential issues and recommends refactoring solutions, thus improving code quality and maintainability.


## Installation

1. Clone the repository:  
`git clone https://github.com/icpcs/motokopilot-vscode`
2. Install the necessary node modules:  
`npm install`
3. Build the extension:  
`npm run build`
4. Package the extension as a vsix file:  
`vsce package`
5. Install the .vsix file in VSCode.

## Usage

All functionality can be accessed through the context menu by right-clicking on selected text or code in VSCode. Alternatively, you can use the following keyboard shortcuts:

- **ALT+X**: Generate code from instruction
- **ALT+D**: Generate documentation from code

### Generating Code from Instruction

1. Select the text containing the natural language instruction.
2. Use the context menu or press **ALT+X**.
3. Three code generation options will be presented. Switch between them using **ALT+right arrow** or **ALT+left arrow**.
4. Confirm your selection with **ALT+Enter**.

### Generating Documentation from Code

1. Select the Motoko code for which you want to generate documentation.
2. Use the context menu or press **ALT+D**.

### Refactoring Code

**TODO**

## Contributing

Contributions are welcome! Please submit your pull requests, report bugs, or provide feature suggestions on the project's GitHub repository.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
