/**
 * Frontend Service Factory
 * フロントエンド用のDependency Injectionファクトリー
 */

import { TodoUseCases } from '../../domain/use-cases/TodoUseCases'
import { AuthUseCases } from '../../domain/use-cases/AuthUseCases'
import { TodoRepositoryInterface } from '../../domain/repositories/TodoRepositoryInterface'
import { UserRepositoryInterface } from '../../domain/repositories/UserRepositoryInterface'
import { AuthRepositoryInterface } from '../../domain/repositories/AuthRepositoryInterface'

import { SupabaseTodoRepository } from '../repositories/SupabaseTodoRepository'
import { SupabaseUserRepository } from '../repositories/SupabaseUserRepository'
import { SupabaseAuthRepository } from '../repositories/SupabaseAuthRepository'

/**
 * Repository層のインスタンス
 */
interface Repositories {
  todoRepository: TodoRepositoryInterface
  userRepository: UserRepositoryInterface
  authRepository: AuthRepositoryInterface
}

/**
 * UseCase層のインスタンス
 */
interface UseCases {
  todoUseCases: TodoUseCases
  authUseCases: AuthUseCases
}

/**
 * 全てのサービスインスタンス
 */
interface Services extends Repositories, UseCases {}

class FrontendServiceFactory {
  private static instance: FrontendServiceFactory
  private repositories: Repositories | null = null
  private useCases: UseCases | null = null

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): FrontendServiceFactory {
    if (!FrontendServiceFactory.instance) {
      FrontendServiceFactory.instance = new FrontendServiceFactory()
    }
    return FrontendServiceFactory.instance
  }

  /**
   * Repository層のインスタンスを作成・取得
   */
  getRepositories(): Repositories {
    if (!this.repositories) {
      this.repositories = {
        todoRepository: new SupabaseTodoRepository(),
        userRepository: new SupabaseUserRepository(),
        authRepository: new SupabaseAuthRepository()
      }
    }
    return this.repositories
  }

  /**
   * UseCase層のインスタンスを作成・取得
   */
  getUseCases(): UseCases {
    if (!this.useCases) {
      const repositories = this.getRepositories()

      this.useCases = {
        todoUseCases: new TodoUseCases(repositories.todoRepository),
        authUseCases: new AuthUseCases(repositories.authRepository, repositories.userRepository)
      }
    }
    return this.useCases
  }

  /**
   * 全てのサービスインスタンスを取得
   */
  getServices(): Services {
    const repositories = this.getRepositories()
    const useCases = this.getUseCases()

    return {
      ...repositories,
      ...useCases
    }
  }

  /**
   * 特定のUseCaseを取得
   */
  getTodoUseCases(): TodoUseCases {
    return this.getUseCases().todoUseCases
  }

  getAuthUseCases(): AuthUseCases {
    return this.getUseCases().authUseCases
  }

  /**
   * 特定のRepositoryを取得
   */
  getTodoRepository(): TodoRepositoryInterface {
    return this.getRepositories().todoRepository
  }

  getUserRepository(): UserRepositoryInterface {
    return this.getRepositories().userRepository
  }

  getAuthRepository(): AuthRepositoryInterface {
    return this.getRepositories().authRepository
  }

  /**
   * インスタンスをリセット（テスト用）
   */
  reset(): void {
    this.repositories = null
    this.useCases = null
  }
}

/**
 * サービスファクトリーのインスタンスを取得
 */
export const serviceFactory = FrontendServiceFactory.getInstance()

/**
 * 便利な関数群
 */
export const createTodoUseCases = (): TodoUseCases => serviceFactory.getTodoUseCases()
export const createAuthUseCases = (): AuthUseCases => serviceFactory.getAuthUseCases()
export const createTodoRepository = (): TodoRepositoryInterface => serviceFactory.getTodoRepository()
export const createUserRepository = (): UserRepositoryInterface => serviceFactory.getUserRepository()
export const createAuthRepository = (): AuthRepositoryInterface => serviceFactory.getAuthRepository()

/**
 * 全てのサービスを一度に取得
 */
export const createServices = (): Services => serviceFactory.getServices()

/**
 * テスト用のリセット関数
 */
export const resetServices = (): void => serviceFactory.reset()

export default serviceFactory
