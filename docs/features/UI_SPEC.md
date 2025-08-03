# UI・UX 仕様書

## 🎨 デザインシステム

### 技術スタック
- **フレームワーク**: Next.js 14 (App Router) + TypeScript
- **UI ライブラリ**: Tailwind CSS + Radix UI
- **状態管理**: Zustand
- **アイコン**: Lucide React
- **レスポンシブ**: モバイルファースト設計

### カラーパレット
- **プライマリ**: Tailwind Blue系 (`blue-500`, `blue-600`)
- **セカンダリ**: Gray系 (`gray-100`, `gray-200`, `gray-800`)
- **アクセント**: 四象限別カラー（後述）
- **エラー**: Red系 (`red-500`, `red-600`)
- **成功**: Green系 (`green-500`, `green-600`)

## 📱 レスポンシブデザイン

### ブレークポイント
```css
/* モバイル */
@media (max-width: 768px) {
  /* ハンバーガーメニュー表示 */
  /* カード縦積み */
  /* 四象限 → リスト表示に自動切換 */
}

/* タブレット */
@media (min-width: 769px) and (max-width: 1024px) {
  /* 四象限表示維持 */
  /* サイドバーコンパクト */
}

/* デスクトップ */
@media (min-width: 1025px) {
  /* フル機能表示 */
  /* ホバー効果有効 */
}
```

### モバイル対応
- **ナビゲーション**: ハンバーガーメニューに収納
- **四象限表示**: 自動的にリスト表示に切り替え
- **タッチ操作**: スワイプジェスチャー対応
- **フォント**: モバイルで読みやすいサイズに調整

## 🧭 画面構成とレイアウト

### グローバル構成（全ページ共通）

```jsx
<div className="min-h-screen bg-gray-50">
  <Navigation /> {/* 上部固定ナビゲーション */}
  <main className="container mx-auto px-4 py-6">
    {children} {/* 各ページコンテンツ */}
  </main>
  <CreateTodoModal /> {/* 全画面共通モーダル */}
</div>
```

#### ナビゲーションバー
- **位置**: 上部固定 (`sticky top-0`)
- **構成**: ロゴ、タブメニュー、新規作成ボタン、ユーザーメニュー
- **モバイル**: ハンバーガーメニューとサイドドロワー

```jsx
<nav className="bg-white shadow-sm border-b sticky top-0 z-40">
  <div className="flex items-center justify-between px-4 py-3">
    <Logo />
    <TabMenu /> {/* デスクトップ */}
    <div className="flex items-center gap-2">
      <CreateButton />
      <UserMenu />
      <MobileMenuButton /> {/* モバイルのみ */}
    </div>
  </div>
</nav>
```

#### タブメニュー
- **📋 ダッシュボード** (`/`)
- **⚖️ 優先度比較** (`/compare`)
- **📊 レポート** (`/report`)
- **⚙️ 設定** (`/settings`)

## 📋 ダッシュボード画面 (`/`)

### レイアウト構成

```jsx
<div className="space-y-6">
  <PageHeader />
  <ViewToggle /> {/* 四象限 ⟷ リスト切り替え */}
  <TodoGrid /> {/* メインコンテンツ */}
</div>
```

### 表示モード切り替え

#### 四象限マトリクスビュー
```jsx
<div className="grid grid-cols-2 gap-4 h-[600px]">
  <QuadrantSection 
    title="🔥 今すぐやる"
    subtitle="緊急 × 重要"
    color="bg-red-50 border-red-200"
    todos={urgentImportant}
  />
  <QuadrantSection 
    title="📅 計画してやる"
    subtitle="重要 × 緊急でない"
    color="bg-blue-50 border-blue-200"
    todos={notUrgentImportant}
  />
  <QuadrantSection 
    title="⚡ さっさと片付ける"
    subtitle="緊急 × 重要でない"
    color="bg-yellow-50 border-yellow-200"
    todos={urgentNotImportant}
  />
  <QuadrantSection 
    title="📝 後回し"
    subtitle="重要でない × 緊急でない"
    color="bg-gray-50 border-gray-200"
    todos={notUrgentNotImportant}
  />
</div>
```

#### フラットリストビュー
```jsx
<div className="space-y-3">
  {sortedTodos.map(todo => (
    <TodoCard key={todo.id} todo={todo} layout="horizontal" />
  ))}
</div>
```

### TODOカード仕様

#### 基本構造
```jsx
<div className="bg-white rounded-lg border p-4 hover:shadow-lg transition-all duration-200">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600 mt-1">{truncatedBody}</p>
      <div className="flex items-center gap-2 mt-2">
        <UrgencyBadge />
        <DeadlineBadge />
      </div>
    </div>
    <ActionButtons />
  </div>
</div>
```

#### ホバー機能
- **拡大効果**: `hover:scale-105` でカード拡大
- **シャドウ強調**: `hover:shadow-lg` で立体感
- **本文プレビュー**: 200文字まで表示、超過時は「もっと見る」ボタン

```jsx
const [isExpanded, setIsExpanded] = useState(false)
const [isHovered, setIsHovered] = useState(false)

const displayText = useMemo(() => {
  if (isExpanded || body.length <= 200) return body
  return body.substring(0, 200) + '...'
}, [body, isExpanded])
```

#### 期限切れタスク対応
```jsx
{isOverdue && (
  <div className="flex gap-1">
    <Button size="sm" variant="success" onClick={onComplete}>
      ✅ 完了
    </Button>
    <Button size="sm" variant="outline" onClick={onExtendDeadline}>
      📅 延長
    </Button>
    <Button size="sm" variant="destructive" onClick={onDelete}>
      🗑️ 削除
    </Button>
  </div>
)}
```

### バッジ・ステータス表示

#### 緊急度バッジ
```jsx
const urgencyConfig = {
  today: { label: '今日中', color: 'bg-red-100 text-red-800' },
  tomorrow: { label: '明日', color: 'bg-yellow-100 text-yellow-800' },
  later: { label: 'それより後', color: 'bg-gray-100 text-gray-800' }
}
```

#### 期限日表示
```jsx
const formatDeadline = (deadline: string) => {
  const today = new Date()
  const deadlineDate = new Date(deadline)
  const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '明日'
  if (diffDays === -1) return '1日遅れ'
  if (diffDays < 0) return `${Math.abs(diffDays)}日遅れ`
  return `${diffDays}日後`
}
```

## ➕ タスク作成モーダル

### モーダル構造
```jsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>新規タスク作成</DialogTitle>
    </DialogHeader>
    <TodoForm onSubmit={handleSubmit} />
  </DialogContent>
</Dialog>
```

### フォーム構成

#### 本文入力エリア
```jsx
<div className="space-y-2">
  <Label htmlFor="body">本文</Label>
  <Textarea
    id="body"
    value={body}
    onChange={handleBodyChange}
    placeholder="タスクの詳細を入力してください（SlackのURLも含められます）"
    className="min-h-[120px]"
  />
  {slackUrlDetected && (
    <SlackMessagePreview url={detectedUrl} />
  )}
</div>
```

#### Slack連携プレビュー
```jsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
  <div className="flex items-center gap-2 mb-2">
    <SlackIcon className="w-4 h-4" />
    <span className="text-sm font-medium">Slackメッセージ</span>
  </div>
  <div className="text-sm text-gray-700">
    <p><strong>{userName}</strong> - {channelName}</p>
    <p className="mt-1">{messageContent}</p>
  </div>
</div>
```

#### 緊急度選択
```jsx
<div className="grid grid-cols-3 gap-2">
  {[
    { value: 'today', label: '今日中', icon: '🔥' },
    { value: 'tomorrow', label: '明日', icon: '📅' },
    { value: 'later', label: 'それより後', icon: '📝' }
  ].map(option => (
    <Button
      key={option.value}
      type="button"
      variant={urgency === option.value ? 'default' : 'outline'}
      onClick={() => setUrgency(option.value)}
      className="h-auto py-3"
    >
      <div className="text-center">
        <div className="text-lg">{option.icon}</div>
        <div className="text-sm">{option.label}</div>
      </div>
    </Button>
  ))}
</div>
```

#### 期限日自動設定
```jsx
const handleUrgencyChange = (newUrgency: Urgency) => {
  setUrgency(newUrgency)
  
  // 期限日を自動設定
  const deadline = getDeadlineFromUrgency(newUrgency)
  setDeadline(deadline)
}

const getDeadlineFromUrgency = (urgency: Urgency): string | null => {
  const today = new Date()
  
  switch (urgency) {
    case 'today':
      return today.toISOString().split('T')[0]
    case 'tomorrow':
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    case 'later':
      return null
  }
}
```

#### AI見出し生成
```jsx
<div className="flex items-center gap-2">
  <Input
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    placeholder="タスクのタイトル（自動生成も可能）"
  />
  <Button
    type="button"
    variant="outline"
    onClick={handleGenerateTitle}
    disabled={isGenerating || !body.trim()}
  >
    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : '🧠'}
    見出し生成
  </Button>
</div>
```

## ⚖️ 優先度比較画面 (`/compare`)

### レイアウト構成
```jsx
<div className="max-w-4xl mx-auto space-y-6">
  <PageHeader />
  <ComparisonArea />
  <ProgressIndicator />
</div>
```

### 比較カード
```jsx
<div className="grid md:grid-cols-2 gap-6">
  {[taskA, taskB].map((task, index) => (
    <ComparisonCard
      key={task.id}
      task={task}
      onSelect={() => handleSelect(task.id)}
      className="cursor-pointer hover:ring-2 hover:ring-blue-300"
    />
  ))}
</div>
```

### 比較カード詳細
```jsx
<div className="bg-white border rounded-lg p-6 transition-all duration-200">
  <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
  <p className="text-gray-600 mb-4 whitespace-pre-wrap">{task.body}</p>
  
  <div className="flex items-center justify-between text-sm">
    <UrgencyBadge urgency={getUrgencyFromDeadline(task.deadline)} />
    {task.deadline && (
      <span className="text-gray-500">
        期限: {formatDeadline(task.deadline)}
      </span>
    )}
  </div>
  
  <Button 
    className="w-full mt-4"
    onClick={() => onSelect(task.id)}
  >
    こちらが重要
  </Button>
</div>
```

### 進捗表示
```jsx
<div className="bg-white rounded-lg p-4">
  <div className="flex justify-between text-sm mb-2">
    <span>比較進捗</span>
    <span>{completedComparisons} / {totalComparisons}</span>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
      style={{ width: `${(completedComparisons / totalComparisons) * 100}%` }}
    />
  </div>
</div>
```

## 📊 レポート画面 (`/report`)

### レイアウト構成
```jsx
<div className="space-y-6">
  <PageHeader />
  <TimePeriodSelector />
  <StatsGrid />
  <ChartsSection />
  <CompletedTasksList />
</div>
```

### 統計カード
```jsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {[
    { title: '🔥 今すぐやる', count: urgentImportantCount, color: 'border-red-200' },
    { title: '📅 計画してやる', count: notUrgentImportantCount, color: 'border-blue-200' },
    { title: '⚡ さっさと片付ける', count: urgentNotImportantCount, color: 'border-yellow-200' },
    { title: '📝 後回し', count: notUrgentNotImportantCount, color: 'border-gray-200' }
  ].map(stat => (
    <div key={stat.title} className={`bg-white rounded-lg border-2 ${stat.color} p-4`}>
      <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
      <p className="text-2xl font-bold mt-1">{stat.count}</p>
    </div>
  ))}
</div>
```

### グラフコンポーネント
```jsx
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from 'recharts'

// 四象限別円グラフ
<PieChart width={400} height={300}>
  <Pie
    data={quadrantData}
    cx={200}
    cy={150}
    innerRadius={60}
    outerRadius={100}
    paddingAngle={5}
    dataKey="count"
  >
    {quadrantData.map((entry, index) => (
      <Cell key={index} fill={COLORS[index]} />
    ))}
  </Pie>
</PieChart>

// 時系列バーチャート
<BarChart width={600} height={300} data={timeSeriesData}>
  <XAxis dataKey="date" />
  <YAxis />
  <Bar dataKey="count" fill="#3b82f6" />
</BarChart>
```

## ⚙️ 設定画面 (`/settings`)

### レイアウト構成
```jsx
<div className="max-w-2xl mx-auto space-y-8">
  <PageHeader />
  <UserProfileSection />
  <SlackIntegrationSection />
  <EmojiSettingsSection />
  <NotificationSettingsSection />
</div>
```

### Slack連携セクション
```jsx
<div className="bg-white rounded-lg border p-6">
  <h2 className="text-lg font-semibold mb-4">Slack連携</h2>
  
  {isConnected ? (
    <ConnectedState connection={slackConnection} />
  ) : (
    <DisconnectedState onConnect={handleSlackConnect} />
  )}
  
  {isConnected && (
    <WebhookManagement webhooks={webhooks} />
  )}
</div>
```

### 絵文字設定セクション
```jsx
<div className="bg-white rounded-lg border p-6">
  <h2 className="text-lg font-semibold mb-4">絵文字リアクション設定</h2>
  
  <div className="space-y-4">
    {[
      { key: 'today', label: '今日中', default: 'memo' },
      { key: 'tomorrow', label: '明日', default: 'pencil' },
      { key: 'later', label: 'それより後', default: 'spiral_note_pad' }
    ].map(setting => (
      <EmojiSelector
        key={setting.key}
        label={setting.label}
        value={emojiSettings[setting.key]}
        onChange={(emoji) => handleEmojiChange(setting.key, emoji)}
        options={availableEmojis}
      />
    ))}
  </div>
</div>
```

### 通知設定セクション
```jsx
<div className="bg-white rounded-lg border p-6">
  <h2 className="text-lg font-semibold mb-4">通知設定</h2>
  
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium">Webhook通知</h3>
        <p className="text-sm text-gray-600">
          Slackリアクション作成時にブラウザ通知を受信
        </p>
      </div>
      <Switch
        checked={enableWebhookNotifications}
        onCheckedChange={setEnableWebhookNotifications}
      />
    </div>
    
    <NotificationPermissionStatus />
    <TestNotificationButton />
  </div>
</div>
```

## 🎯 インタラクション・アニメーション

### ホバー効果
```css
.todo-card {
  @apply transition-all duration-200 ease-in-out;
}

.todo-card:hover {
  @apply scale-105 shadow-lg;
}
```

### ローディング状態
```jsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      処理中...
    </>
  ) : (
    '保存'
  )}
</Button>
```

### トランジション
```jsx
// ページ遷移
<div className="transition-opacity duration-300 ease-in-out">
  {children}
</div>

// モーダル表示
<DialogContent className="animate-in fade-in-0 zoom-in-95 duration-300">
  {content}
</DialogContent>
```

## 📐 アクセシビリティ

### キーボードナビゲーション
- **Tab**: フォーカス移動
- **Enter**: ボタン実行、モーダル開閉
- **Escape**: モーダル閉じる
- **矢印キー**: 四象限間移動（予定）

### スクリーンリーダー対応
```jsx
<Button aria-label="新規タスクを作成">
  <Plus className="w-4 h-4" />
</Button>

<div role="main" aria-labelledby="dashboard-title">
  <h1 id="dashboard-title">ダッシュボード</h1>
  {/* コンテンツ */}
</div>
```

### カラーアクセシビリティ
- **コントラスト比**: WCAG AA準拠 (4.5:1以上)
- **色だけに依存しない**: アイコンとテキストで情報伝達
- **フォーカスインジケーター**: 明確な視覚的フィードバック

## 🔧 パフォーマンス最適化

### 画像最適化
```jsx
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="アプリロゴ"
  width={120}
  height={40}
  priority={true}
/>
```

### コンポーネント最適化
```jsx
// メモ化
const TodoCard = memo(({ todo, onUpdate }) => {
  return <div>{/* カード内容 */}</div>
})

// 適切な依存関係
const memoizedValue = useMemo(() => {
  return heavyCalculation(data)
}, [data])
```

### レンダリング最適化
```jsx
// 仮想化（大量データ時）
import { FixedSizeList as List } from 'react-window'

<List
  height={600}
  itemCount={todos.length}
  itemSize={100}
  itemData={todos}
>
  {TodoRow}
</List>
```

## 📱 モバイル固有機能

### タッチジェスチャー
```jsx
// スワイプアクション（予定）
const handleSwipe = useSwipeable({
  onSwipedLeft: () => handleComplete(todo.id),
  onSwipedRight: () => handleEdit(todo.id),
  preventDefaultTouchmoveEvent: true,
  trackMouse: true
})
```

### ネイティブ機能
```jsx
// ブラウザ通知
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}
```

## 📚 関連ドキュメント

- [開発ガイド](../development/DEVELOPMENT.md) - UI開発のベストプラクティス
- [Slack連携](./SLACK.md) - Slack関連UI機能
- [アーキテクチャ](../architecture/ARCHITECTURE.md) - フロントエンド設計
- [セットアップガイド](../setup/SETUP.md) - 開発環境構築