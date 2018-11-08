import IJsonObject from "./IJsonObject"
import ISessionId from "./ISessionId"
import IPrompt from "./IPrompt"

/**
 * Implemented to provide application logic.
 * @template TState The JSON-serializable type of application state.
 * @template TEvent The JSON-serializable type of changes to application state.
 */
export default interface IApplication<
  TState extends IJsonObject,
  TEvent extends IJsonObject
  > {
  /**
   * A title to show in clients.
   */
  readonly title: string

  /**
   * The initial application state.
   */
  initial(): TState

  /**
   * Generates a new state by applying an event to an existing state.
   * @param state The state to apply an event to.
   * @param event The event to apply to the state.
   * @returns A new state representing that given, after the given event is
   * applied.
   */
  apply(state: TState, event: TEvent): TState

  /**
   * Generates a prompt to show from a state and viewing session ID.
   * @param state The state from which to generate a prompt.
   * @param sessionId The viewing session ID for which to generate a prompt.
   * @returns A new prompt generated from the given state and viewing session
   * ID.
   */
  view(state: TState, sessionId: ISessionId): IPrompt<TEvent>
}