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
	const symbol_text = document.getText(symbol.range)
	const docstring_pattern = /^(\s+)?(def|class)(.+?:[ \t]*)(\n)(\s+)?(\"{3}.+?\"{3})/gms
	const parts = docstring_pattern.exec(symbol_text);
	if (parts === null) {
		// We couldn't find a docstring in the body
		return child_starts
	}
	// We found a docstring. However, we don't know which line it starts on (the
	// function may be defined over multiple lines) and we don't know how long
	// the docstring is; we don't want to fold single-line docstrings, so we
	// need to figure out how many lines it spans.
	const definition_text = parts[3];
	const definition_lines = definition_text.split("\n").length
	const docstring_text = parts[6] 
	const docstring_lines = docstring_text.split("\n").length
	if (docstring_lines == 1) {
		return child_starts
	}
	const docstring_start_line = symbol.range.start.line + definition_lines
	child_starts.push(docstring_start_line)
	return child_starts
}

export function deactivate() {}
