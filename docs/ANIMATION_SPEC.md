# 动画规格：LeetCode 94 二叉树的中序遍历

## 算法与可观察状态

演示迭代与递归两种独立遍历。主结构为二叉树；辅助结构为显式栈/递归调用栈和结果序列。每个树节点以 `TreeNode.id` 作为演示期间的身份，树坐标由固定的中序序号与深度决定。输入重建时会创建一棵新树，切帧时身份与布局必须保持不变。

可观察状态：当前节点、已访问节点集合、迭代栈或递归帧、结果数组、执行方法与当前代码锚点。

## 步骤语义

| 操作 | 画布焦点 | 解说意图 | 代码锚点 |
| --- | --- | --- | --- |
| `init` | 根/空树与空辅助结构 | 初始化状态，说明空树边界 | `init` |
| `push` | 当前节点与栈顶 | 保存节点以便左侧处理完成后回到它 | `push` |
| `move` | 子节点与父子边 | 沿左/右指针继续处理，维持左-根-右次序 | `left` / `right` |
| `pop` | 栈顶/递归帧 | 左侧完成后恢复最近尚未访问的节点 | `pop` / `return` |
| `visit` | 当前节点与结果项 | 左子树结束后将根值追加到结果 | `visit` |
| `done` | 全部结果与已访问节点 | 所有节点按左-根-右次序输出 | `done` |

当前实现的数据来源是 `TraversalStep.action` 与 `description`；`enrichStepsWithDebug` 按方法将步骤绑定到代码行。当前没有统一动画帧契约，步骤也未携带标准 `operation` / `narration` / `anchorIds`，下表是目标分镜，不表示现有实现已经达成 AC-023。

## 坐标与图层

- 逻辑布局由 `src/utils/tree/treeEngine.ts` 的中序序号确定：`x = inorderIndex * nodeSpacing`，`y = depth * levelHeight`。
- 画布身份使用 `TreeNodeData.nodeId`；边使用父子 ID 组合，禁止依赖数组索引作为 join key。
- 渲染层：edges、nodes、labels、legend、action-arrows 均由一次创建的分层与稳定语义 ID keyed enter/update/exit 驱动；`src/utils/tree/treeMotionLayout.ts` 依中序序号+深度生成确定坐标并映射到视口，切帧不重排。动作箭头锚定当前节点，并标注入栈/弹出/移动/访问动作与当前步骤简述；左右边线用邻近青绿色区分。当前还没有树容器与统一 AlgorithmStep 帧契约，AC-023 整体仍未通过。
- 递归与迭代栈都应作为有槽位、容量、方向指针和空状态的容器，而非仅展示裸值。

## 空间预算（目标值，尚未通过实测）

按 09-layout-visual-design 的 canvas-first 规则，1366×768 顶部/输入/页签/控制合计 ≤26%、画布卡片 ≥62%、SVG ≥50%；1920×1080 分别 ≤22%、≥76%、≥66%。当前页面仍有题目描述、独立速度栏、独立栈区等布局，尚未实现这些目标门槛；需要重构页面后以 Playwright 在两个视口实测，不能按预期值记 PASS。

## 步骤预算与分镜

当前算法实现约 13–63 步，取决于输入树和递归/迭代方式；目标收敛到二叉树遍历推荐的 10–25 个语义步骤。下表是统一后的目标操作词汇：`init` 初始化、`push` 保存待回溯节点、`move` 沿子边移动、`pop` 恢复最近祖先、`visit` 将节点追加到结果、`done` 显示最终序列。每个未来步骤须带稳定 anchor ID 与不重复的解释性 narration。当前接口尚未存储这些标准字段，也没有验证步骤总数/锚点的测试。

## 状态、动效与无障碍

状态图例固定为 `current / compare / visited / done`，如需错误态再加 `error`。不得以颜色作为唯一信号，禁止紫色系。焦点离开后保留 `visited`，每帧最多一个 `current`。

树节点、边、标签过渡使用 `src/utils/tree/treeRenderer.ts` 的 `MOTION` token（enter 220ms、update 260ms、exit 180ms）；状态切帧按稳定 ID 复用并中断相关命名过渡，退出在过渡 end 回调清理。`prefers-reduced-motion: reduce` 时 D3 状态/坐标即时写入，CSS transition/animation 关闭，图例与当前状态继续更新。页面步骤本身尚未加入标准 `operation/narration/anchorIds`，且还缺统一帧容器，因此 AC-023 仍为 FAIL。

## 验证场景

1. 例 `[1,null,2,3]` 的中序结果为 `[1,3,2]`；空树结果为 `[]`。
2. 对相邻步骤核对节点身份与位置稳定；快速连续跳步后旧节点/标签无残留。
3. 1x 与 3x 播放、随机跳步、解法切换；核对焦点、代码行、栈/调用帧、结果和解说一致。
4. reduced-motion 下确认过渡关闭但信息完整。
5. 在 1366×768 与 1920×1080 测量画布、SVG、代码栏和顶部空间预算。

## 当前差距

当前 tree renderer 已采用分层 keyed join，不再整屏清空；画布已显示锚定当前节点的动作箭头与步骤简述。代码面板现默认展示完整 15 行代码，stack/result 快照常驻，其余变量与调用栈折叠；工作区栈栏压缩至 190px。尚缺标准 `operation/narration/anchorIds` 的统一算法帧契约、栈/递归帧作为真实容器、完整单屏教学层以及完整视觉证据，因此 AC-023 仍判定 FAIL。
