# Yet Another Cline

> [!IMPORTANT]  
> ### ✨ Post-fork Features ✨ <br>
> * 💪 自定义系统提示词 <br>
> * 📉 减少CLINE模式下的token消耗 <br>
> * 🧄 减少聊天机器人场景下的token消耗 <br>
> * 🔥 美化聊天界面 <br>
> * 💎 直接集成DeepSeek v3 <br>
> * 🚀 快速切换API提供商 <br>
> * 🧪 提供codelen快捷命令 <br>

### 💪 自定义系统提示词

自定义系统提示词，以满足您的需求。您可以更改Cline的行为。 <br>
<img width="720" img src="https://github.com/debug-dream/ocopilot/releases/download/customize-system-prompts/system_prompt_demo.png" alt="prompt settings"/><br>

### 🔥 美化的聊天界面

在聊天场景中提供一个美观的聊天界面。 <br>
<img width="720" img src="https://github.com/debug-dream/ocopilot/releases/download/customize-system-prompts/chatview-ui.png" alt="chat view"/><br>

### 🧄 减少聊天机器人场景下的token消耗

聊天机器人场景下的token消耗显著减少。 <br>
<img width="720" img src="https://github.com/debug-dream/ocopilot/releases/download/customize-system-prompts/compare-tokens.png" alt="token consumption"/><br>

### 📉 减少CLINE模式下的token消耗

Aline可以减少CLINE场景下的token消耗。<br>
例如，在相同的提示下，ocopilot消耗31k tokens，而cline消耗45k tokens。  <br>
<details>
    Aline消耗31k tokens <br>
<img width="720" img src="https://github.com/debug-dream/ocopilot/releases/download/cdn/ocopilot-cline-mode.png" alt="ocopilot-reduce-token"/><br>
    Cline消耗45k tokens <br>
<img width="720" img src="https://github.com/debug-dream/ocopilot/releases/download/cdn/origin-cline-mode.png" alt="origin-token"/><br>
</details>
<br>

### 🚀 快速切换API提供商

您可以点击API提供商选项，快速切换不同的提供商。 <br>
<img width="720" img src="https://github.com/debug-dream/ocopilot/releases/download/customize-system-prompts/api_provider_demo.png" alt="provider option"/><br>

### 🧪 提供codelen快捷命令

提供codelen快捷命令，以快速执行代码分析任务。 <br>
<img width="720" img src="https://github.com/debug-dream/ocopilot/releases/download/cdn/codelen.png" alt="codelen shortcut"/><br>
<br>


<br><br>
---


Meet Cline, an AI assistant that can use your **CLI** a**N**d **E**ditor.

<p align="center">
  <img src="https://media.githubusercontent.com/media/cline/cline/main/assets/docs/demo.gif" width="100%" />
</p>

<img align="right" width="340" src="https://github.com/user-attachments/assets/3cf21e04-7ce9-4d22-a7b9-ba2c595e88a4"><br>

### 使用任意API和模型

Cline支持OpenRouter、Anthropic、OpenAI、Google Gemini、AWS Bedrock、Azure和GCP Vertex等API提供商。您还可以配置任何与OpenAI兼容的API，或通过LM Studio/Ollama使用本地模型。如果使用OpenRouter，插件会获取最新模型列表，让您第一时间使用新模型。

插件还会跟踪整个任务循环和单个请求的token总量和API使用成本，让您随时掌握开销。


<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="left" width="370" src="https://github.com/user-attachments/assets/81be79a8-1fdb-4028-9129-5fe055e01e76">

### 自动在终端运行命令

借助VSCode [v1.93](https://code.visualstudio.com/updates/v1_93#_terminal-shell-integration-api)的Shell集成更新，Cline可以直接在终端执行命令并获取输出。它能完成从安装包、运行构建脚本到部署应用、管理数据库和执行测试等任务，同时适应您的开发环境和工具链。

对于长时间运行的进程（如开发服务器），使用“后台运行”按钮让Cline在任务中继续工作，命令在后台运行。Cline会实时接收终端输出，及时处理问题（如编译错误）。

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="right" width="400" src="https://github.com/user-attachments/assets/c5977833-d9b8-491e-90f9-05f9cd38c588">

### 自动创建和编辑文件

Cline可以直接在编辑器中创建和编辑文件，并显示更改的差异视图。您可以在差异视图中编辑或撤销更改，或在聊天中提供反馈，直到满意为止。Cline还会监控Linter/编译器错误（如缺少导入、语法错误等），自动修复问题。

所有更改都会记录在文件的时间线中，方便跟踪和回滚。

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="left" width="370" src="https://github.com/user-attachments/assets/bc2e85ba-dfeb-4fe6-9942-7cfc4703cbe5">

### 自动使用浏览器


借助Claude 3.5 Sonnet的[计算机使用功能](https://www.anthropic.com/news/3-5-models-and-computer-use)，Cline可以启动浏览器、点击元素、输入文本、滚动页面，并在每一步捕获截图和控制台日志。这支持交互式调试、端到端测试，甚至一般网页操作！它能自主修复视觉错误和运行时问题，无需您手动复制粘贴日志。

尝试让Cline“测试应用”，它会运行`npm run dev`，在浏览器中启动本地开发服务器，并执行一系列测试以确保一切正常。[查看演示](https://x.com/sdrzn/status/1850880547825823989)。

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="right" width="360" src="https://github.com/user-attachments/assets/7fdf41e6-281a-4b4b-ac19-020b838b6970">

### 添加上下文

-   **`@url`:** 粘贴URL，插件会将其转换为Markdown，方便提供最新文档。
-   **`@problems`:** 添加工作区错误和警告（“问题”面板），供Cline修复。
-   **`@file`:**  添加文件内容，避免浪费API请求读取文件（支持按类型搜索文件）。
-   **`@folder`:** 一次性添加文件夹中的所有文件，进一步加快工作流程。

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="right" width="350" src="https://github.com/user-attachments/assets/140c8606-d3bf-41b9-9a1f-4dbf0d4c90cb">

### 检查点：比较与恢复

Cline在任务过程中会为工作区创建快照。您可以使用“比较”按钮查看快照与当前工作区的差异，或使用“恢复”按钮回滚到该点。

例如，使用本地Web服务器时，可以通过“仅恢复工作区”快速测试不同版本的应用，找到满意的版本后使用“恢复任务和工作区”继续构建。这使您可以安全探索不同方案，而不会丢失进度。

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

## Contributing

<details>
<summary>Local Development Instructions</summary>

1. Clone the repository _(Requires [git-lfs](https://git-lfs.com/))_:
    ```bash
    git clone https://github.com/cline/cline.git
    ```
2. Open the project in VSCode:
    ```bash
    code cline
    ```
3. Install the necessary dependencies for the extension and webview-gui:
    ```bash
    npm run install:all
    ```
4. Launch by pressing `F5` (or `Run`->`Start Debugging`) to open a new VSCode window with the extension loaded. (You may need to install the [esbuild problem matchers extension](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers) if you run into issues building the project.)

</details>