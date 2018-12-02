import IJsonObject from "../../IJsonObject"
import IStatelessSet from "../../State/IStatelessSet"
import IStateContainer from "../../State/IStateContainer"
import { MultiMessageHandler } from "../../Actors/IMultiMessageHandler"
import IErrorHandler from "../../Actors/IErrorHandler"
import IMailbox from "../../Actors/IMailbox"
import IActor from "../../Actors/IActor"
import ILogMessages from "../../Logging/ILogMessages"
import IApplication from "../IApplication"
import ICoreMessages from "./ICoreMessages"
import IPluginMessages from "./IPluginMessages"

/**
 * Hosts an application, performing all "plumbing".
 * @template TState The JSON-serializable type of application state.
 * @template TEvent The JSON-serializable type of changes to application state.
 * @template TApplication The application type hosted.
 */
export default class Core<
  TState extends IJsonObject,
  TEvent extends IJsonObject,
  TApplication extends IApplication<TState, TEvent>
  > implements MultiMessageHandler<ICoreMessages<TState, TEvent, TApplication>> {
  private readonly plugins: IStatelessSet<IActor<IPluginMessages<TState, TEvent, TApplication>>>
  private readonly state: IStateContainer<TState>
  private readonly logger: IActor<ILogMessages>

  /**
   * @param PluginsStatelessSet The constructor for the set of installed
   * plugins.
   * @param errorHandler The error handler for plugins to use.
   * @param application The application hosted.
   * @param logger The logger to use.
   */
  constructor(
    PluginsStatelessSet: {
      new(): IStatelessSet<
        IActor<IPluginMessages<TState, TEvent, TApplication>>
      >
    },
    StateContainer: { new(state: TState): IStateContainer<TState> },
    private readonly PluginActor: {
      new(
        Mailbox: {
          new(): IMailbox<IPluginMessages<TState, TEvent, TApplication>>
        },
        multiMessageHandler: MultiMessageHandler<
          IPluginMessages<TState, TEvent, TApplication>
        >,
        errorHandler: IErrorHandler
      ): IActor<IPluginMessages<TState, TEvent, TApplication>>
    },
    LoggerActor: {
      new(
        Mailbox: { new(): IMailbox<ILogMessages> },
        multiMessageHandler: MultiMessageHandler<ILogMessages>,
        errorHandler: IErrorHandler
      ): IActor<ILogMessages>
    },
    private readonly errorHandler: IErrorHandler,
    private readonly application: TApplication,
    logger: MultiMessageHandler<ILogMessages>
  ) {
    this.plugins = new PluginsStatelessSet()
    this.state = new StateContainer(application.initial())
    this.logger = new LoggerActor(Array, logger, errorHandler)
  }

  /**
   * @inheritdoc
   */
  async install(
    receivedBy: IActor<ICoreMessages<TState, TEvent, TApplication>>,
    message: {
      readonly plugin: MultiMessageHandler<
        IPluginMessages<TState, TEvent, TApplication>
      >,
      readonly name: string
    }
  ): Promise<void> {
    const actor = new this.PluginActor(Array, message.plugin, this.errorHandler)
    this.plugins.push(actor)
    actor.tell({
      key: `installed`,
      value: {
        core: receivedBy,
        application: this.application,
        state: this.state,
        logger: this.logger
      }
    })
    this.logger.tell({
      key: `information`,
      value: {
        message: `Plugin "${message.name}" has been installed.`
      }
    })
  }

  /**
   * @inheritdoc
   */
  async replaceState(
    receivedBy: IActor<ICoreMessages<TState, TEvent, TApplication>>,
    message: {
      readonly state: TState
    }
  ): Promise<void> {
    this.state.set(message.state)
    this.plugins.forEach(plugin => plugin.tell({
      key: `stateChanged`,
      value: {
        event: null
      }
    }))
    this.logger.tell({
      key: `information`,
      value: {
        message: `Application state has been replaced.`
      }
    })
  }
}