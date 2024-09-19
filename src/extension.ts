import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const disposable_fold = vscode.commands.registerCommand('blahblah.foldDocstrings', async () => {
		const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const symbols = await vscode.commands.executeCommand(
				'vscode.executeDocumentSymbolProvider',
				document.uri
			) as vscode.DocumentSymbol[] | undefined;

			if (symbols === undefined) {
				vscode.window.showErrorMessage('Document symbols are unavailable currently. Please try again in a minute.');
				return
			}

			const start_lines = symbols.flatMap((symbol) => docstring_start_lines_for_symbol(symbol, document))
			const fold_args: FoldingArguments = {levels: 1, direction: 'down', selectionLines: start_lines};
			vscode.commands.executeCommand('editor.fold', fold_args);
        }
    });

    context.subscriptions.push(disposable_fold);

	const disposable_unfold = vscode.commands.registerCommand('blahblah.unfoldDocstrings', async () => {
        // vscode.window.showInformationMessage('Hello World!');
		const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const symbols = await vscode.commands.executeCommand(
				'vscode.executeDocumentSymbolProvider',
				document.uri
			) as vscode.DocumentSymbol[] | undefined;

			if (symbols === undefined) {
				vscode.window.showErrorMessage('Document symbols are unavailable currently. Please try again in a minute.');
				return
			}

			const start_lines = symbols.flatMap((symbol) => docstring_start_lines_for_symbol(symbol, document))
			const fold_args: FoldingArguments = {levels: 1, direction: 'down', selectionLines: start_lines};
			vscode.commands.executeCommand('editor.unfold', fold_args);
        }
    });

    context.subscriptions.push(disposable_unfold);
}

interface FoldingArguments {
	levels?: number;
	direction?: 'up' | 'down';
	selectionLines?: number[];
}

// Recursive function that returns the docstring ranges that are underneath this
// symbol. It is recursive because symbols can be nested, e.g. the symbol for a
// class will have a child for each method defined in the class.
function docstring_start_lines_for_symbol(symbol: vscode.DocumentSymbol, document: vscode.TextDocument): number[] {
	const pertinent_symbols = [vscode.SymbolKind.Function, vscode.SymbolKind.Method, vscode.SymbolKind.Class] 
	// If this symbol isn't a function or a class then it won't contain any docstrings
	if (!pertinent_symbols.includes(symbol.kind)){
		return [];
	}
	// Gather the ranges from this symbol's children
	let child_starts = symbol.children.flatMap((child) => docstring_start_lines_for_symbol(child, document));
	// Now detect if this function/class/method has a docstring, and if so, what
	// its line range is
	const first_body_line_number = symbol.range.start.line + 1
	const body_range = new vscode.Range(new vscode.Position(first_body_line_number, 0), symbol.range.end)
	const body_text = document.getText(body_range)
	const docstring_pattern = /^(\s+)?(\"{3}.+?\"{3})/gms
	const parts = docstring_pattern.exec(body_text);
	if (parts === null) {
		// We couldn't find a docstring in the body
		return child_starts
	}
	// We found a docstring. However, we don't want to fold single-line
	// docstrings, so we need to figure out how many lines it spans 
	const docstring_text = parts[2] 
	const n_lines = docstring_text.split("\n").length
	if (n_lines > 1) {
		child_starts.push(first_body_line_number)
	}
	return child_starts
}

export function deactivate() {}
