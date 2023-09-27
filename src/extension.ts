import * as vscode from 'vscode';

import { exec } from 'child_process';

interface MemoryInfo {
  used: number;
  free: number;
}

function getGPUMemoryUsage(gpuIndex: number): Promise<MemoryInfo> {
  return new Promise((resolve, reject) => {
    exec("nvidia-smi -q -d MEMORY", (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`stderr: ${stderr}`);
        return;
      }
      
      // Separate GPU info blocks
      const gpuInfo = stdout.split('==============\n')[gpuIndex + 1];
      if (!gpuInfo) {
        reject(new Error('Requested GPU index is out of range.'));
        return;
      }

      // Extract the memory usage block
      const memoryUsageBlock = gpuInfo.split('FB Memory Usage\n')[1];

      // Extract the used and free memory values
      const usedMemoryStr = memoryUsageBlock.match(/Used\s+:\s+(\d+)/)![1];
      const freeMemoryStr = memoryUsageBlock.match(/Free\s+:\s+(\d+)/)![1];

      const usedMemory = parseInt(usedMemoryStr, 10);
      const freeMemory = parseInt(freeMemoryStr, 10);

      resolve({ used: usedMemory, free: freeMemory });
    });
  });
}

// 拡張機能がアクティブになった時に呼び出される
export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "gpu-monitor" is now active!');
	const cudaIndex = 0;

	// nvidia-smi が実行可能かどうかを確認
	try {
		await getGPUMemoryUsage(cudaIndex);
	} catch (error) {
		console.log(`nvidia-smi is not available. ${error}`);
		return;
	}

	// 実行可能な場合、2秒ごとにGPUのメモリ使用量を取得し、ステータスバーに表示する
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
	setInterval(async () => {
			const {used, free} = await getGPUMemoryUsage(cudaIndex);;
			statusBarItem.text = `(cuda:${cudaIndex}) ${used} / ${used + free} MB`;
			statusBarItem.show();
	}, 2000);
}

// 非アクティブになった時に呼び出される
export function deactivate() {}
