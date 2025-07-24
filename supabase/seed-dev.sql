-- Development seed data for TODO app
-- This script creates test todos and data for UI testing

DO $$
DECLARE
    test_user_id UUID;
    todo_id_1 UUID := gen_random_uuid();
    todo_id_2 UUID := gen_random_uuid();
    todo_id_3 UUID := gen_random_uuid();
    todo_id_4 UUID := gen_random_uuid();
    todo_id_5 UUID := gen_random_uuid();
    todo_id_6 UUID := gen_random_uuid();
    todo_id_7 UUID := gen_random_uuid();
    todo_id_8 UUID := gen_random_uuid();
    todo_id_9 UUID := gen_random_uuid();
    todo_id_10 UUID := gen_random_uuid();
    todo_id_11 UUID := gen_random_uuid();
    todo_id_12 UUID := gen_random_uuid();
    todo_id_13 UUID := gen_random_uuid();
    todo_id_14 UUID := gen_random_uuid();
    todo_id_15 UUID := gen_random_uuid();
    todo_id_16 UUID := gen_random_uuid();
    todo_id_17 UUID := gen_random_uuid();
BEGIN
    -- Try to find an existing user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated users found. Please sign up in the app first, then run this seed script.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Loading seed data for user ID: %', test_user_id;
    
    -- Clear existing data for this user
    DELETE FROM completion_log WHERE todo_id IN (
        SELECT id FROM todos WHERE user_id = test_user_id
    );
    DELETE FROM comparisons WHERE user_id = test_user_id;
    DELETE FROM todos WHERE user_id = test_user_id;
    
    -- Update user profile with test data
    INSERT INTO users (id, display_name, slack_user_id, created_at) 
    VALUES (test_user_id, 'テストユーザー', 'U1234567890', NOW() - INTERVAL '30 days')
    ON CONFLICT (id) DO UPDATE SET
        display_name = 'テストユーザー',
        slack_user_id = 'U1234567890';
    
    -- Insert todos with various states
    INSERT INTO todos (id, user_id, title, body, deadline, importance_score, status, created_at, completed_at) VALUES
      -- 緊急×重要 (今日期限、高重要度)
      (todo_id_1, test_user_id, '本日締切のプレゼン資料完成', '明日の重要会議で使用するプレゼン資料を完成させる。グラフとデータ分析が必要。', CURRENT_DATE, 0.9, 'open', NOW() - INTERVAL '2 days', NULL),
      (todo_id_2, test_user_id, 'システム障害の緊急対応', 'サーバーのメモリ使用率が90%を超えているため、緊急でスケールアップ対応が必要。', CURRENT_DATE, 0.95, 'open', NOW() - INTERVAL '1 day', NULL),
      
      -- 重要×緊急でない (将来期限、高重要度)
      (todo_id_3, test_user_id, '来四半期の戦略立案', '次の四半期に向けた事業戦略とKPIを設定する。市場調査も含む。', CURRENT_DATE + INTERVAL '14 days', 0.85, 'open', NOW() - INTERVAL '3 days', NULL),
      (todo_id_4, test_user_id, 'チームメンバーとの1on1面談', '各メンバーのキャリア目標と現在の課題について話し合う定期面談。', CURRENT_DATE + INTERVAL '7 days', 0.75, 'open', NOW() - INTERVAL '1 day', NULL),
      
      -- 緊急×重要でない (今日期限、低重要度)
      (todo_id_5, test_user_id, '事務用品の発注', 'オフィスの文房具が不足しているため、事務用品をまとめて発注する。', CURRENT_DATE, 0.3, 'open', NOW() - INTERVAL '1 day', NULL),
      (todo_id_6, test_user_id, '会議室の予約システム更新', '会議室予約システムの表示が古くなっているため、最新情報に更新する。', CURRENT_DATE + INTERVAL '1 day', 0.4, 'open', NOW() - INTERVAL '2 days', NULL),
      
      -- 重要でない×緊急でない (将来期限、低重要度)
      (todo_id_7, test_user_id, '古いドキュメントの整理', '過去のプロジェクトドキュメントを整理して、不要なファイルを削除する。', CURRENT_DATE + INTERVAL '21 days', 0.2, 'open', NOW() - INTERVAL '5 days', NULL),
      (todo_id_8, test_user_id, 'オフィスの観葉植物の手入れ', 'オフィスにある観葉植物の水やりと、枯れた葉の除去を行う。', CURRENT_DATE + INTERVAL '10 days', 0.1, 'open', NOW() - INTERVAL '3 days', NULL),
      
      -- 期限なしのタスク
      (todo_id_9, test_user_id, '新しいプログラミング言語の学習', 'Rustプログラミング言語の基礎を学習して、実際に小さなプロジェクトを作成してみる。', NULL, 0.6, 'open', NOW() - INTERVAL '4 days', NULL),
      (todo_id_10, test_user_id, '読書: 技術書の読了', '「Clean Architecture」を読み終えて、学んだ内容を実際のプロジェクトに適用する。', NULL, 0.7, 'open', NOW() - INTERVAL '1 week', NULL),
      
      -- 完了済みタスク (completion_logテスト用)
      (todo_id_11, test_user_id, '先週の週報作成', '先週の活動内容をまとめて、週報として提出完了。', CURRENT_DATE - INTERVAL '3 days', 0.8, 'done', NOW() - INTERVAL '1 week', NOW() - INTERVAL '3 days'),
      (todo_id_12, test_user_id, 'バックアップシステムの確認', 'データベースバックアップが正常に動作していることを確認して完了。', CURRENT_DATE - INTERVAL '5 days', 0.9, 'done', NOW() - INTERVAL '1 week', NOW() - INTERVAL '5 days'),
      (todo_id_13, test_user_id, 'チームランチの店舗予約', 'チームビルディングのためのランチ会場を予約して準備完了。', CURRENT_DATE - INTERVAL '2 days', 0.4, 'done', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
      
      -- 期限切れタスク
      (todo_id_14, test_user_id, '先月の経費精算', '出張費と会議費の経費精算を行う。領収書の整理も必要。', CURRENT_DATE - INTERVAL '7 days', 0.6, 'open', NOW() - INTERVAL '2 weeks', NULL),
      (todo_id_15, test_user_id, '古いライブラリのアップデート', 'セキュリティ脆弱性があるライブラリを最新版にアップデートする。', CURRENT_DATE - INTERVAL '3 days', 0.8, 'open', NOW() - INTERVAL '1 week', NULL),
      
      -- Slackメッセージ風のタスク (Slack連携テスト用)
      (todo_id_16, test_user_id, 'API仕様の確認お願いします', 'new APIエンドポイントの仕様書を確認して、フロントエンド側の実装方針を検討したいです。特にエラーハンドリングの部分について意見をお聞かせください。

[Slack message](https://example.slack.com/archives/C1234567890/p1640995200000)', CURRENT_DATE + INTERVAL '2 days', 0.7, 'open', NOW() - INTERVAL '2 hours', NULL),
      (todo_id_17, test_user_id, 'データベース設計レビュー', 'ユーザー管理システムのER図を作成しました。テーブル構造とリレーションシップについてレビューをお願いします。

[Slack message](https://example.slack.com/archives/C1234567890/p1640995800000)', CURRENT_DATE + INTERVAL '1 day', 0.85, 'open', NOW() - INTERVAL '4 hours', NULL);
    
    -- Insert comparisons data (for Elo rating system testing)
    INSERT INTO comparisons (user_id, winner_id, loser_id, created_at) VALUES
      (test_user_id, todo_id_2, todo_id_1, NOW() - INTERVAL '1 day'),
      (test_user_id, todo_id_3, todo_id_4, NOW() - INTERVAL '2 days'),
      (test_user_id, todo_id_14, todo_id_7, NOW() - INTERVAL '3 days'),
      (test_user_id, todo_id_10, todo_id_9, NOW() - INTERVAL '4 days'),
      (test_user_id, todo_id_17, todo_id_16, NOW() - INTERVAL '1 hour');
    
    -- Insert completion log data (for report page testing)
    INSERT INTO completion_log (todo_id, quadrant, completed_at) VALUES
      (todo_id_11, 'not_urgent_important', NOW() - INTERVAL '3 days'),
      (todo_id_12, 'urgent_important', NOW() - INTERVAL '5 days'),
      (todo_id_13, 'urgent_not_important', NOW() - INTERVAL '2 days');
    
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE '• 17 todos with various states (open/done, different quadrants)';
    RAISE NOTICE '• 5 comparison records for Elo rating testing';
    RAISE NOTICE '• 3 completion log entries for report page testing';
    RAISE NOTICE '• Mix of deadlines: today, future, past, and none';
    RAISE NOTICE '• Slack-style messages for integration testing';
    
END $$;