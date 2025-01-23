import * as vscode from 'vscode';
import { fetchAllTestCasesGraphQL } from './fetchTestCases';
import { testAllCases } from './runTestCases';

// Activate the extension
export function activate(context: vscode.ExtensionContext) {
    const fetchTestCasesCommand = vscode.commands.registerCommand('cph.fetchTestCases', async () => {
        const url = await vscode.window.showInputBox({
            prompt: 'Enter LeetCode Problem URL',
        });

        if (url) {
            const problemSlugMatch = url.match(/leetcode\.com\/problems\/([\w-]+)\//);
            if (problemSlugMatch) {
                const problemSlug = problemSlugMatch[1];
                await fetchAllTestCasesGraphQL(problemSlug);
            } else {
                vscode.window.showErrorMessage('Invalid LeetCode Problem URL');
            }
        }
    });
   // git remote add origin https://github.com/PawanSinghh01/leetcode-test-case-runner.git

    const runTestCasesCommand = vscode.commands.registerCommand('cph.runTestCases', async () => {
        const scriptPath = await vscode.window.showInputBox({
            prompt: 'Enter the path to your script file to test against inputs',
        });

        if (scriptPath) {
            await testAllCases(scriptPath);
        } else {
            vscode.window.showErrorMessage('Invalid script file path.');
        }
    });

    context.subscriptions.push(fetchTestCasesCommand, runTestCasesCommand);
}

// Deactivate the extension
export function deactivate() {}
