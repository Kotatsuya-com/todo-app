import { create } from 'zustand'
import { Todo, User, Comparison } from '@/types'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'

interface TodoStore {
  user: User | null
  todos: Todo[]
  comparisons: Comparison[]
  loading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  signOut: () => Promise<void>
  fetchTodos: () => Promise<void>
  createTodo: (todo: Partial<Todo>) => Promise<void>
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  completeTodo: (id: string) => Promise<void>
  reopenTodo: (id: string) => Promise<void>
  fetchComparisons: () => Promise<void>
  createComparison: (winnerId: string, loserId: string) => Promise<void>
  updateImportanceScores: () => Promise<void>
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  user: null,
  todos: [],
  comparisons: [],
  loading: false,
  error: null,

  setUser: (user) => set({ user }),

  signOut: async () => {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      // ローカル状態をクリア
      set({
        user: null,
        todos: [],
        comparisons: [],
        loading: false,
        error: null
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  fetchTodos: async () => {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        set({ todos: [], loading: false })
        return
      }

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('importance_score', { ascending: false })
        .order('deadline', { ascending: true })

      if (error) throw error
      set({ todos: data || [], loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createTodo: async (todo) => {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('User not authenticated')

      // 緊急度を期限日に変換（urgencyフィールドは保存しない）
      let deadline: string | undefined = todo.deadline
      if (!deadline && todo.urgency) {
        const now = new Date()
        switch (todo.urgency) {
          case 'today':
            deadline = format(now, 'yyyy-MM-dd')
            break
          case 'tomorrow':
            now.setDate(now.getDate() + 1)
            deadline = format(now, 'yyyy-MM-dd')
            break
          case 'later':
            // 期限なし（undefined）
            deadline = undefined
            break
        }
      }

      // urgencyフィールドを除外してデータベースに保存
      const { urgency, ...todoWithoutUrgency } = todo

      // 初期重要度スコアを期限に基づいて設定
      let initialImportanceScore = todoWithoutUrgency.importance_score || 0.5
      if (initialImportanceScore === 0.5) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const isOverdue = deadline ? new Date(deadline) < today : false
        const isToday = deadline ? new Date(deadline).getTime() === today.getTime() : false
        
        if (isOverdue) {
          initialImportanceScore = 0.7 // 期限切れは高めの重要度
        } else if (isToday) {
          initialImportanceScore = 0.6 // 今日期限は中程度の重要度
        } else {
          // ランダムに0.3-0.7の範囲で初期化（中央値を避ける）
          initialImportanceScore = 0.3 + Math.random() * 0.4
        }
      }

      const { data, error } = await supabase
        .from('todos')
        .insert({
          ...todoWithoutUrgency,
          user_id: user.id,
          deadline,
          importance_score: initialImportanceScore,
          status: 'open'
        })
        .select()
        .single()

      if (error) throw error
      set(state => ({ todos: [...state.todos, data], loading: false }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  updateTodo: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      set(state => ({
        todos: state.todos.map(todo => todo.id === id ? data : todo),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  deleteTodo: async (id) => {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()
      
      // 関連するcomparisonsを削除
      await supabase
        .from('comparisons')
        .delete()
        .or(`winner_id.eq.${id},loser_id.eq.${id}`)
      
      // 関連するcompletion_logを削除
      await supabase
        .from('completion_log')
        .delete()
        .eq('todo_id', id)
      
      // todoを削除
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)

      if (error) throw error
      set(state => ({
        todos: state.todos.filter(todo => todo.id !== id),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  completeTodo: async (id) => {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()
      const todo = get().todos.find(t => t.id === id)
      
      if (!todo) throw new Error('Todo not found')

      // TODOを完了状態に更新
      const { error: updateError } = await supabase
        .from('todos')
        .update({
          status: 'done',
          completed_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) throw updateError

      // 四象限を判定（期限ベース）
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const isUrgent = todo.deadline ? new Date(todo.deadline) <= today : false
      const isImportant = todo.importance_score > 0.5
      const quadrant = 
        isUrgent && isImportant ? 'urgent_important' :
        !isUrgent && isImportant ? 'not_urgent_important' :
        isUrgent && !isImportant ? 'urgent_not_important' :
        'not_urgent_not_important'

      // completion_logに記録
      const { error: logError } = await supabase
        .from('completion_log')
        .insert({
          todo_id: id,
          quadrant,
          completed_at: new Date().toISOString()
        })

      if (logError) throw logError

      set(state => ({
        todos: state.todos.map(todo => 
          todo.id === id 
            ? { ...todo, status: 'done' as const, completed_at: new Date().toISOString() }
            : todo
        ),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  reopenTodo: async (id) => {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()

      // TODOを未完了状態に戻す
      const { error: updateError } = await supabase
        .from('todos')
        .update({
          status: 'open',
          completed_at: null
        })
        .eq('id', id)

      if (updateError) throw updateError

      // 関連するcompletion_logエントリを削除
      const { error: deleteError } = await supabase
        .from('completion_log')
        .delete()
        .eq('todo_id', id)

      if (deleteError) throw deleteError

      // ローカル状態を更新
      set(state => ({
        todos: state.todos.map(todo => 
          todo.id === id 
            ? { ...todo, status: 'open' as const, completed_at: undefined }
            : todo
        ),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchComparisons: async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('comparisons')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      set({ comparisons: data || [] })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  createComparison: async (winnerId, loserId) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('comparisons')
        .insert({
          user_id: user.id,
          winner_id: winnerId,
          loser_id: loserId
        })
        .select()
        .single()

      if (error) throw error
      set(state => ({ comparisons: [...state.comparisons, data] }))
      
      // 重要度スコアを更新
      await get().updateImportanceScores()
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  updateImportanceScores: async () => {
    // 簡易的なEloレーティングシステムを実装
    const todos = get().todos
    const comparisons = get().comparisons
    const K = 32 // K-factor

    console.log('🔍 [DEBUG] updateImportanceScores - 開始')
    console.log('🔍 [DEBUG] Todos count:', todos.length)
    console.log('🔍 [DEBUG] Comparisons count:', comparisons.length)

    // 各TODOのスコアを初期化（緊急度に基づいて差別化）
    const scores = new Map<string, number>()
    todos.forEach(todo => {
      let initialScore = todo.importance_score
      
      // 初期スコアが設定されていない場合、緊急度と期限で初期化
      if (initialScore === 0.5 || !initialScore) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const isOverdue = todo.deadline ? new Date(todo.deadline) < today : false
        const isToday = todo.deadline ? new Date(todo.deadline).getTime() === today.getTime() : false
        
        if (isOverdue) {
          initialScore = 0.7 // 期限切れは高めの重要度
        } else if (isToday) {
          initialScore = 0.6 // 今日期限は中程度の重要度
        } else {
          // ランダムに0.3-0.7の範囲で初期化（中央値を避ける）
          initialScore = 0.3 + Math.random() * 0.4
        }
      }
      
      scores.set(todo.id, initialScore)
      console.log(`🔍 [DEBUG] Todo "${todo.title}" - Initial score: ${initialScore} (deadline: ${todo.deadline})`)
    })

    // 比較結果に基づいてスコアを更新
    comparisons.forEach(comp => {
      const winnerScore = scores.get(comp.winner_id) || 0.5
      const loserScore = scores.get(comp.loser_id) || 0.5

      // 期待値を計算
      const expectedWinner = 1 / (1 + Math.pow(10, (loserScore - winnerScore) / 0.4))
      const expectedLoser = 1 - expectedWinner

      // スコアを更新
      scores.set(comp.winner_id, winnerScore + K * (1 - expectedWinner))
      scores.set(comp.loser_id, loserScore + K * (0 - expectedLoser))
    })

    // スコアを正規化（0-1の範囲に）
    const minScore = Math.min(...Array.from(scores.values()))
    const maxScore = Math.max(...Array.from(scores.values()))
    const range = maxScore - minScore || 1

    console.log('🔍 [DEBUG] 正規化前 - minScore:', minScore, 'maxScore:', maxScore, 'range:', range)
    console.log('🔍 [DEBUG] 正規化前の全スコア:', Array.from(scores.entries()))

    // データベースを更新
    const supabase = createClient()
    for (const [todoId, score] of Array.from(scores.entries())) {
      const normalizedScore = (score - minScore) / range
      const todo = todos.find(t => t.id === todoId)
      console.log(`🔍 [DEBUG] Todo "${todo?.title}" - Raw score: ${score}, Normalized: ${normalizedScore}`)
      await supabase
        .from('todos')
        .update({ importance_score: normalizedScore })
        .eq('id', todoId)
    }

    // ローカルステートを更新
    await get().fetchTodos()
  }
}))