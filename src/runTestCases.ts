import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// Run user code and capture output in a text file
async function runUserCode(input: string, scriptPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const binaryPath = path.join(path.dirname(scriptPath), 'a.out');
        const outputFilePath = path.join(path.dirname(scriptPath), 'output.txt');
        const inputFilePath = path.join(path.dirname(scriptPath), 'input_temp.txt');

        fs.writeFileSync(inputFilePath, input, 'utf8');

        exec(`g++ "${scriptPath}" -o "${binaryPath}"`, (compileError, _, compileStderr) => {
            if (compileError) {
                reject(`Compilation failed: ${compileStderr}`);
                return;
            }

            const command = process.platform === 'win32'
                ? `"${binaryPath}" < "${inputFilePath}" > "${outputFilePath}"`
                : `"${binaryPath}" < "${inputFilePath}" > "${outputFilePath}"`;

            exec(command, (execError, _, stderr) => {
                if (execError) {
                    reject(`Execution failed: ${stderr || execError.message}`);
                } else {
                    fs.readFile(outputFilePath, 'utf8', (readError, data) => {
                        if (readError) {
                            reject(`Failed to read output file: ${readError.message}`);
                        } else {
                            resolve(data.trim());
                        }
                    });
                }
            });
        });
    });
}

// Compare generated output with expected output
function compareOutputs(generated: string, expected: string): boolean {
    return generated === expected;
}

// Test all test cases
export async function testAllCases(scriptPath: string): Promise<void> {
    try {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('Please open a workspace to run test cases.');
            return;
        }
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

        const inputFiles = fs.readdirSync(workspacePath).filter(file => file.startsWith('input_') && file.endsWith('.txt'));
        const outputFiles = fs.readdirSync(workspacePath).filter(file => file.startsWith('output_') && file.endsWith('.txt'));

        if (inputFiles.length !== outputFiles.length) {
            vscode.window.showErrorMessage('Mismatch between the number of input and output files.');
            return;
        }

        for (let i = 0; i < inputFiles.length; i++) {
            const inputFilePath = path.join(workspacePath, inputFiles[i]);
            const outputFilePath = path.join(workspacePath, outputFiles[i]);

            const input = fs.readFileSync(inputFilePath, 'utf8').trim();
            const expectedOutput = fs.readFileSync(outputFilePath, 'utf8').trim();

            try {
                const generatedOutput = await runUserCode(input, scriptPath);

                if (compareOutputs(generatedOutput, expectedOutput)) {
                    vscode.window.showInformationMessage(`Test case ${i + 1}: Passed`);
                } else {
                    vscode.window.showErrorMessage(`Test case ${i + 1}: Failed\nExpected: ${expectedOutput}\nGenerated: ${generatedOutput}`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error executing test case ${i + 1}: ${error}`);
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error testing cases: ${error.message}`);
    }
}
