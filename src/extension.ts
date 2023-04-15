import * as vscode from 'vscode';
import { Configuration, CreateCompletionResponse, OpenAIApi } from "openai";
import {
	initAuth,
	createPayload,
	validatePayload,
	setNewAPIKey,
	getFileExtension,
	buildStatusBarItem,
	Config,
	OPENAI_API_KEY,
	getConfValue
} from './utils';
import { AxiosResponse } from 'axios';

let decorationType = vscode.window.createTextEditorDecorationType({
	color: 'grey'
});

const initOpenAI = (credentials: Config): OpenAIApi => {
	const openaiConfig = new Configuration({
		...credentials
	});

	return new OpenAIApi(openaiConfig);
};

// This method is called when the extension is activated
export async function activate(context: vscode.ExtensionContext) {
	console.log('Activated');

	const credentials = await initAuth(context);
	if (!credentials) {
		deactivate();
		return;
	}

	const openai = initOpenAI(credentials);

	const statusBarItem = buildStatusBarItem();

	statusBarItem.show();

	const modalMesesageOptions = {
		"modal": true,
		"detail": "- GPT-3"
	};

	//global
	let outputArray: string[] = [];
	let output: string;
	let i = 1;
	let range: vscode.Selection | vscode.Range | vscode.Position;
	let decorations: readonly vscode.Range[] | readonly vscode.DecorationOptions[];
	let endPosition: vscode.Position;
	let numLines: number;
	let responseBasic: AxiosResponse<CreateCompletionResponse, any>;
	let responseBalanced: AxiosResponse<CreateCompletionResponse, any>;
	let responseCreative: AxiosResponse<CreateCompletionResponse, any>;

	// Create documentation for highlighted Motoko code
	let createDocumentation = vscode.commands.registerCommand('GPT.createDocs', async () => {
		console.log('Running createDocs');

		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		const selectedText = editor.document.getText(editor.selection);

		if (!selectedText) {
			vscode.window.showWarningMessage('No selected text');
			return;
		}

		let fileExtension = getFileExtension(editor.document.fileName);

		statusBarItem.hide();
		const statusMessage = vscode.window.setStatusBarMessage('$(heart) Generating your documentation! $(book)');

		const response = await openai.createChatCompletion({
			"model": "gpt-3.5-turbo",
			"temperature": getConfValue<number>('temperature'),
			messages: [
				{ "role": "system", "content": "You are an AI tool used to generate simple, easy to understand and human-readable explanations of Motoko code. Your responses must be single paragraph, plain-text and not contain markdown or numbered lists." },
				{ "role": "user", "content": "I will provide you with snippets of Motoko code. Write a comment that provides documentation on that code. The comment should be as short as possible, concise, and easy for inexperienced coders to understand. Variable names do not need to be specified. Do not explain each function in the code, only the broad functionality. Begin with: 'This is a...'. Do you understand?" },
				{ "role": "user", "content": selectedText }
			]
		});


		const output = splitString(response.data.choices[0].message?.content?.trim());

		editor.edit((editBuilder) => {
			editBuilder.insert(editor.selection.start, `${output}\n`);
		});

		statusMessage.dispose();
		statusBarItem.show();
	});


	//newline fix
	function splitString(str: any) {
		let result = "";
		let words = str.split(" ");
		let line = "";
		for (let i = 0; i < words.length; i++) {
			if (line.length + words[i].length + 1 <= 70) {
				line += " " + words[i];
			} else {
				result += line + "\n";
				line = words[i];
			}
		}
		result += line;
		return "/*\n" + result + "\n*/\n";
	}



	// Create Motoko code for highlighted documentation
	let createCodeFromDocumentation = vscode.commands.registerCommand('GPT.createCodeFromDocs', async () => {
		console.log('Running createCodeFromDocs');

		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}


		let place = new vscode.Range(editor.selection.end, editor.selection.end);
		let decorationTypeSpinner = vscode.window.createTextEditorDecorationType({
		});


		let spinner = ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'];
		let y = 0;

		let interval = setInterval(() => {
			let decorationsSpinner = [{
				range: place,
				color: 'pink',
				renderOptions: {
					after: {
						contentText: `${spinner[y]} Generating Motoko code...`
					}
				}
			}];
			editor.setDecorations(decorationTypeSpinner, decorationsSpinner);
			y = (y + 1) % spinner.length;
		}, 100);


		const selectedText = editor.document.getText(editor.selection);

		if (!selectedText) {
			vscode.window.showWarningMessage('No selected text');
			return;
		}

		statusBarItem.hide();
		const statusMessage = vscode.window.setStatusBarMessage('$(heart) Generating your code! $(code)');

		const prompt = selectedText.replace("//", "").replace(/\n/g, "\\n") + "###";

		// Define a new TextEditorDecorationType with grey color
		decorationType = vscode.window.createTextEditorDecorationType({
			color: 'grey'
		});

		const promiseBasic = getCompletionBasic('code', prompt);
		const promiseBalanced = getCompletionBalanced('code_temp_03', prompt);
		const promiseCreative = getCompletionCreative('code_temp_07', prompt);

		// Wait for all promises to complete
		await Promise.all([promiseBasic, promiseBalanced, promiseCreative]);

		outputArray[0] = "\n" + "//Option: 1" + '\n' + responseBasic.data.choices[0].text?.trim().replace(/\\n/g, '\n');
		outputArray[1] = "\n" + "//Option: 2" + '\n' + responseBalanced.data.choices[0].text?.trim().replace(/\\n/g, '\n');
		outputArray[2] = "\n" + "//Option: 3" + '\n' + responseCreative.data.choices[0].text?.trim().replace(/\\n/g, '\n');

		editor.edit(editBuilder => {
			editor.setDecorations(decorationTypeSpinner, []);
			editBuilder.delete(place);
		});
		clearInterval(interval);


		output = outputArray[0];
		numLines = output.split('\n').length;
		endPosition = editor.selection.end;

		let start = endPosition;
		let end = endPosition.with(endPosition.line + numLines, 0);
		range = new vscode.Range(start, end);

		decorations = [{
			range: range
		}];


		editor.edit(editBuilder => {
			editBuilder.insert(endPosition, output);
		}).then(() => {
			// Apply the decorations to the editor
			editor.setDecorations(decorationType, decorations);
		})

		statusMessage.dispose();
		statusBarItem.show();
	});

	//Right arrow 
	let rightArrow = vscode.commands.registerTextEditorCommand('GPT.rightArrow', () => {
		console.log('The "Right arrow button" was pressed!');

		if (!outputArray || !output) {
			return;
		}

		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		let lastLines = numLines;

		if (i <= 2) {
			output = outputArray[i];
		} else {
			i = 0;
			output = outputArray[i];
		}

		let newLines = output.split('\n').length;
		let start = endPosition;
		let end = endPosition.with(endPosition.line + lastLines, 0);
		let new_range = new vscode.Range(start, end);

		decorations = [{
			range: new_range
		}];

		editor.edit(editBuilder => {
			editBuilder.replace(new_range, output + '\n');
			editor.setDecorations(decorationType, decorations);
		})
		i++;
		numLines = newLines;
	});


	async function getCompletionBasic(type: string, prompt: string) {
		let payloadBasic = createPayload('code', prompt);

		let { isValid, reason } = validatePayload(payloadBasic);

		if (!isValid) {
			vscode.window.showErrorMessage(reason);
			deactivate();
		};

		responseBasic = await openai.createCompletion({ ...payloadBasic });
		console.log("getCompletionBasic completed");

		return responseBasic;
	}

	async function getCompletionBalanced(type: string, prompt: string) {
		let payloadBalanced = createPayload('code_temp_03', prompt);

		let { isValid, reason } = validatePayload(payloadBalanced);

		if (!isValid) {
			vscode.window.showErrorMessage(reason);
			deactivate();
		};

		responseBalanced = await openai.createCompletion({ ...payloadBalanced });
		console.log("getCompletionBalanced completed");

		return responseBalanced;
	}

	async function getCompletionCreative(type: string, prompt: string) {
		let payloadCreative = createPayload('code_temp_07', prompt);

		let { isValid, reason } = validatePayload(payloadCreative);

		if (!isValid) {
			vscode.window.showErrorMessage(reason);
			deactivate();
		};

		responseCreative = await openai.createCompletion({ ...payloadCreative });
		console.log("getCompletionCreative completed");

		return responseCreative;
	}



	let acceptOption = vscode.commands.registerTextEditorCommand('GPT.acceptOption', () => {
		console.log('The "acceptOption" was pressed!');

		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}
		editor.edit(editBuilder => {

			editor.setDecorations(decorationType, []);

		})

		outputArray = [];
		output = '';
		i = 1;

	});

	// Update OpenAI API Key
	let updateAPIKey = vscode.commands.registerCommand('GPT.updateAPIKey', async () => {
		console.log('Running updateAPIKey');

		statusBarItem.hide();
		const statusMessage = vscode.window.setStatusBarMessage('$(heart) Securely storing your API Key $(pencil)');

		await setNewAPIKey(context);

		statusMessage.dispose();
		statusBarItem.show();
	});

	// Remove OpenAI API Key
	let removeAPIKey = vscode.commands.registerCommand('GPT.removeAPIKey', async () => {
		console.log('Running removeAPIKey');

		statusBarItem.hide();
		const statusMessage = vscode.window.setStatusBarMessage('$(heart) Securely REMOVING your API Key $(error)');

		await context.secrets.delete(OPENAI_API_KEY);

		statusMessage.dispose();
		statusBarItem.show();
	});


	context.subscriptions.push(
		createDocumentation,
		createCodeFromDocumentation,
		updateAPIKey,
		removeAPIKey,
		acceptOption,
		rightArrow
	);
};

// This method is called when your extension is deactivated
export function deactivate() { }
