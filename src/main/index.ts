import { IComponent, getStudioProApi, ComponentContext, MessageInfo } from "@mendix/extensions-api";

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

let studioPro: ReturnType<typeof getStudioProApi>;

export const component: IComponent = {
    async loaded(componentContext: ComponentContext) {
        studioPro = getStudioProApi(componentContext);

        // Add context menu item to Java Actions in the App Explorer
        await studioPro.ui.appExplorer.addContextMenu(
            {
                menuId: "JavaEditor.OpenEditor",
                caption: "Edit Java Source",
                action: async () => {
                    // Get the active document info to determine which Java Action was right-clicked
                    const activeDoc = await studioPro.ui.editors.getActiveDocument();
                    if (activeDoc && activeDoc.documentName && activeDoc.moduleName) {
                        await openJavaEditorTab(activeDoc.documentName, activeDoc.moduleName);
                    }
                }
            },
            "CodeActions$JavaAction"
        );

        // Also add menu item to the Extensions menu for convenience
        await studioPro.ui.extensionsMenu.add({
            menuId: "JavaEditor.MainMenu",
            caption: "Java Editor",
            subMenus: [
                { menuId: "JavaEditor.OpenCurrentAction", caption: "Edit Current Java Action" },
            ],
        });

        // Handle extensions menu clicks
        studioPro.ui.extensionsMenu.addEventListener(
            "menuItemActivated",
            async (args) => {
                if (args.menuId === "JavaEditor.OpenCurrentAction") {
                    const activeDoc = await studioPro.ui.editors.getActiveDocument();
                    if (activeDoc && activeDoc.documentType === "CodeActions$JavaAction" && activeDoc.documentName && activeDoc.moduleName) {
                        await openJavaEditorTab(activeDoc.documentName, activeDoc.moduleName);
                    } else {
                        await studioPro.ui.messageBoxes.show(
                            "warning",
                            "No Java Action Selected",
                            "Please open a Java Action document first."
                        );
                    }
                }
            }
        );

        // Set up message handler to communicate with UI
        await studioPro.ui.messagePassing.addMessageHandler<JavaEditorMessage>(async (messageInfo: MessageInfo<JavaEditorMessage>) => {
            const message = messageInfo.message;
            try {
                if (message.type === "getJavaFile" && message.filePath) {
                    const content = await studioPro.app.files.getFile(message.filePath);
                    await studioPro.ui.messagePassing.sendResponse<JavaEditorResponse>(messageInfo.messageId, {
                        type: "javaFileContent",
                        content: content,
                        filePath: message.filePath
                    });
                } else if (message.type === "saveJavaFile" && message.filePath && message.content !== undefined) {
                    await studioPro.app.files.putFile(message.filePath, message.content);
                    await studioPro.ui.messagePassing.sendResponse<JavaEditorResponse>(messageInfo.messageId, {
                        type: "saveResult",
                        success: true,
                        filePath: message.filePath
                    });
                }
            } catch (error) {
                await studioPro.ui.messagePassing.sendResponse<JavaEditorResponse>(messageInfo.messageId, {
                    type: "error",
                    error: error instanceof Error ? error.message : "Unknown error occurred"
                });
            }
        });
    }
};

async function openJavaEditorTab(javaActionName: string, moduleName: string): Promise<void> {
    // Java action source files are located at javasource/<ModuleName>/actions/<ActionName>.java
    const javaFilePath = `javasource/${moduleName}/actions/${javaActionName}.java`;
    
    await studioPro.ui.tabs.open(
        {
            title: `${javaActionName}.java`,
            icon: "☕"
        },
        {
            componentName: "extension/JavaEditor",
            uiEntrypoint: "tab",
            queryParams: {
                filePath: javaFilePath,
                actionName: javaActionName,
                moduleName: moduleName
            }
        }
    );
}

