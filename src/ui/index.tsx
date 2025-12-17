import React, { StrictMode, useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { IComponent, getStudioProApi, ComponentContext } from "@mendix/extensions-api";

interface JavaEditorMessage {
    type: "openJavaFile" | "saveJavaFile" | "getJavaFile";
    filePath?: string;
    content?: string;
    javaActionName?: string;
    moduleName?: string;
}

interface JavaEditorResponse {
    type: "javaFileContent" | "saveResult" | "error";
    content?: string;
    filePath?: string;
    success?: boolean;
    error?: string;
}

interface JavaEditorProps {
    filePath: string;
    actionName: string;
    moduleName: string;
    componentContext: ComponentContext;
}

function JavaEditor({ filePath, actionName, moduleName, componentContext }: JavaEditorProps) {
    const [content, setContent] = useState<string>("");
    const [originalContent, setOriginalContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const studioPro = getStudioProApi(componentContext);

    // Load the Java file content
    useEffect(() => {
        const loadFile = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                await studioPro.ui.messagePassing.sendMessage<JavaEditorMessage, JavaEditorResponse>(
                    { type: "getJavaFile", filePath },
                    async (response) => {
                        if (response.type === "javaFileContent" && response.content !== undefined) {
                            setContent(response.content);
                            setOriginalContent(response.content);
                            setIsDirty(false);
                        } else if (response.type === "error") {
                            setError(response.error || "Failed to load file");
                        }
                        setIsLoading(false);
                    }
                );
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load file");
                setIsLoading(false);
            }
        };

        loadFile();
    }, [filePath]);

    // Handle content changes
    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        setIsDirty(newContent !== originalContent);
    }, [originalContent]);

    // Save the file
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        setError(null);

        try {
            await studioPro.ui.messagePassing.sendMessage<JavaEditorMessage, JavaEditorResponse>(
                { type: "saveJavaFile", filePath, content },
                async (response) => {
                    if (response.type === "saveResult" && response.success) {
                        setOriginalContent(content);
                        setIsDirty(false);
                    } else if (response.type === "error") {
                        setError(response.error || "Failed to save file");
                    }
                    setIsSaving(false);
                }
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save file");
            setIsSaving(false);
        }
    }, [filePath, content]);

    // Keyboard shortcut for save (Ctrl+S / Cmd+S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (isDirty && !isSaving) {
                    handleSave();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave, isDirty, isSaving]);

    // Handle tab key in textarea
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newContent = content.substring(0, start) + "    " + content.substring(end);
                setContent(newContent);
                setIsDirty(newContent !== originalContent);
                // Set cursor position after the tab
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 4;
                }, 0);
            }
        }
    }, [content, originalContent]);

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading {filePath}...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.fileInfo}>
                    <span style={styles.fileName}>
                        ☕ {actionName}.java
                        {isDirty && <span style={styles.dirtyIndicator}> •</span>}
                    </span>
                    <span style={styles.filePath}>{moduleName}/actions/{actionName}.java</span>
                </div>
                <div style={styles.actions}>
                    <button
                        style={{
                            ...styles.button,
                            ...(isDirty && !isSaving ? styles.buttonPrimary : styles.buttonDisabled)
                        }}
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
            
            {error && (
                <div style={styles.error}>
                    ⚠️ {error}
                </div>
            )}

            <div style={styles.editorContainer}>
                <div style={styles.lineNumbers}>
                    {content.split("\n").map((_, i) => (
                        <div key={i} style={styles.lineNumber}>{i + 1}</div>
                    ))}
                </div>
                <textarea
                    ref={textareaRef}
                    style={styles.editor}
                    value={content}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                />
            </div>
            
            <div style={styles.statusBar}>
                <span>Java | UTF-8</span>
                <span>{content.split("\n").length} lines</span>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        fontFamily: "system-ui, -apple-system, sans-serif",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 16px",
        backgroundColor: "#252526",
        borderBottom: "1px solid #3c3c3c",
    },
    fileInfo: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    fileName: {
        fontSize: "14px",
        fontWeight: 600,
        color: "#ffffff",
    },
    filePath: {
        fontSize: "11px",
        color: "#808080",
    },
    dirtyIndicator: {
        color: "#ffffff",
        fontWeight: "bold",
    },
    actions: {
        display: "flex",
        gap: "8px",
    },
    button: {
        padding: "6px 16px",
        border: "none",
        borderRadius: "4px",
        fontSize: "13px",
        cursor: "pointer",
        fontWeight: 500,
    },
    buttonPrimary: {
        backgroundColor: "#0e639c",
        color: "#ffffff",
    },
    buttonDisabled: {
        backgroundColor: "#3c3c3c",
        color: "#6c6c6c",
        cursor: "not-allowed",
    },
    error: {
        padding: "8px 16px",
        backgroundColor: "#5a1d1d",
        color: "#f48771",
        fontSize: "13px",
    },
    editorContainer: {
        flex: 1,
        display: "flex",
        overflow: "hidden",
    },
    lineNumbers: {
        width: "50px",
        backgroundColor: "#1e1e1e",
        borderRight: "1px solid #3c3c3c",
        padding: "12px 0",
        overflow: "hidden",
        userSelect: "none",
    },
    lineNumber: {
        textAlign: "right",
        paddingRight: "12px",
        fontSize: "13px",
        lineHeight: "20px",
        color: "#858585",
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
    },
    editor: {
        flex: 1,
        resize: "none",
        border: "none",
        outline: "none",
        padding: "12px",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        fontSize: "13px",
        lineHeight: "20px",
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
        tabSize: 4,
    },
    statusBar: {
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 16px",
        backgroundColor: "#007acc",
        color: "#ffffff",
        fontSize: "12px",
    },
    loading: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        fontSize: "14px",
        color: "#808080",
    },
};

export const component: IComponent = {
    async loaded(componentContext: ComponentContext) {
        // Parse query parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const filePath = urlParams.get("filePath") || "";
        const actionName = urlParams.get("actionName") || "Unknown";
        const moduleName = urlParams.get("moduleName") || "Unknown";

        createRoot(document.getElementById("root")!).render(
            <StrictMode>
                <JavaEditor
                    filePath={filePath}
                    actionName={actionName}
                    moduleName={moduleName}
                    componentContext={componentContext}
                />
            </StrictMode>
        );
    }
};
