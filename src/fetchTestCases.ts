import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Fetch test cases from LeetCode
export async function fetchAllTestCasesGraphQL(problemSlug: string): Promise<void> {
    try {
        const graphqlEndpoint = 'https://leetcode.com/graphql';
        const query = `
            query getProblemData($titleSlug: String!) {
                question(titleSlug: $titleSlug) {
                    content
                }
            }
        `;
        const response = await axios.post(graphqlEndpoint, {
            query,
            variables: { titleSlug: problemSlug },
        });
        const questionData = response.data.data.question;
        if (questionData && questionData.content) {
            const content = questionData.content;

            // Extract test cases from content
            const inputOutputPairs = extractTestCases(content);
            if (inputOutputPairs.length === 0) {
                vscode.window.showErrorMessage('No valid test cases found in the problem content.');
                return;
            }

            // Ensure a workspace is open
            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('Please open a workspace to save test cases.');
                return;
            }

            // Get the path to the first workspace folder
            const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

            // Write each input-output pair to separate files
            inputOutputPairs.forEach(({ input, output }, index) => {
                const inputFilePath = path.join(workspacePath, `input_${index + 1}.txt`);
                const outputFilePath = path.join(workspacePath, `output_${index + 1}.txt`);

                fs.writeFileSync(inputFilePath, input, 'utf8');
                fs.writeFileSync(outputFilePath, output, 'utf8');

                vscode.window.showInformationMessage(
                    `Test case ${index + 1} saved to ${inputFilePath} and ${outputFilePath}`
                );
            });
        } else {
            vscode.window.showErrorMessage('No problem content found for the given problem.');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to fetch test cases: ${error.message}`);
    }
}

// Extract test cases from content
function extractTestCases(content: string): { input: string; output: string }[] {
    const inputOutputPairs: { input: string; output: string }[] = [];
    const inputRegex = /Input:\s*([\s\S]*?)\n/g;
    const outputRegex = /Output:\s*([\s\S]*?)\n/g;

    let inputMatch, outputMatch;
    while ((inputMatch = inputRegex.exec(content)) && (outputMatch = outputRegex.exec(content))) {
        const input = cleanInput(inputMatch[1].trim());
        const output = cleanOutput(outputMatch[1].trim());

        inputOutputPairs.push({ input, output });
    }
    return inputOutputPairs;
}

// Clean the input data
function cleanInput(input: string): string {
    // Remove any HTML tags (e.g., <strong>, <p>, etc.)
    let cleaned = input.replace(/<\/?[^>]+(>|$)/g, '').trim();

    // Remove the "grid =" part if present
    cleaned = cleaned.replace(/^grid\s*=\s*/, '').trim();

    // If the input contains "n m" at the start, it's a grid with size n*m
    const sizeMatch = cleaned.match(/^(\d+)\s+(\d+)/);
    if (sizeMatch) {
        const numRows = parseInt(sizeMatch[1], 10);
        const numCols = parseInt(sizeMatch[2], 10);

        // Extract the rest of the input (the grid values)
        let gridContent = cleaned.replace(sizeMatch[0], '').trim();

        // Remove any outer square brackets if present
        if (gridContent.startsWith('[') && gridContent.endsWith(']')) {
            gridContent = gridContent.slice(1, -1);
        }

        // Split the grid content by spaces or commas, and group them into rows
        const values = gridContent.split(/[,\s]+/).map(value => value.trim()).filter(Boolean);
        const rows: string[][] = [];

        for (let i = 0; i < numRows; i++) {
            rows.push(values.slice(i * numCols, (i + 1) * numCols));
        }

        // Format the output: first the size, followed by the grid itself
        const formattedInput = `${numRows} ${numCols}\n` + rows.map(row => row.join(' ')).join('\n');
        return formattedInput;
    }

    // If no valid grid found, return the cleaned input (can be text or other)
    return cleaned.trim();
}


// Clean the output data
function cleanOutput(output: string): string {
    let cleaned = output.replace(/<\/?[^>]+(>|$)/g, '').trim();
    cleaned = cleaned.replace(/[\[\],]/g, ' ').trim();
    cleaned = cleaned.replace(/&quot;/g, '').trim();
    return cleaned;
}
