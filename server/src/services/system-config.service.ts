import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import _ from 'lodash';
import {
  supportedDayTokens,
  supportedHourTokens,
  supportedMinuteTokens,
  supportedMonthTokens,
  supportedPresetTokens,
  supportedSecondTokens,
  supportedWeekTokens,
  supportedYearTokens,
} from 'src/constants';
import { SystemConfigCore } from 'src/cores/system-config.core';
import { OnServerEvent } from 'src/decorators';
import { SystemConfigDto, SystemConfigTemplateStorageOptionDto, mapConfig } from 'src/dtos/system-config.dto';
import { LogLevel, SystemConfig } from 'src/entities/system-config.entity';
import {
  ClientEvent,
  IEventRepository,
  ServerAsyncEvent,
  ServerAsyncEventMap,
  ServerEvent,
} from 'src/interfaces/event.interface';
import { ILoggerRepository } from 'src/interfaces/logger.interface';
import { ISearchRepository } from 'src/interfaces/search.interface';
import { ISystemConfigRepository } from 'src/interfaces/system-config.interface';

@Injectable()
export class SystemConfigService {
  private core: SystemConfigCore;

  constructor(
    @Inject(ISystemConfigRepository) private repository: ISystemConfigRepository,
    @Inject(IEventRepository) private eventRepository: IEventRepository,
    @Inject(ILoggerRepository) private logger: ILoggerRepository,
    @Inject(ISearchRepository) private smartInfoRepository: ISearchRepository,
  ) {
    this.core = SystemConfigCore.create(repository);
    this.core.config$.subscribe((config) => this.setLogLevel(config));
    this.logger.setContext(SystemConfigService.name);
  }

  async init() {
    const config = await this.core.getConfig();
    this.config$.next(config);
  }

  get config$() {
    return this.core.config$;
  }

  async getConfig(): Promise<SystemConfigDto> {
    const config = await this.core.getConfig();
    return mapConfig(config);
  }

  getDefaults(): SystemConfigDto {
    const config = this.core.getDefaults();
    return mapConfig(config);
  }

  @OnServerEvent(ServerAsyncEvent.CONFIG_VALIDATE)
  onValidateConfig({ newConfig, oldConfig }: ServerAsyncEventMap[ServerAsyncEvent.CONFIG_VALIDATE]) {
    if (!_.isEqual(instanceToPlain(newConfig.logging), oldConfig.logging) && this.getEnvLogLevel()) {
      throw new Error('Logging cannot be changed while the environment variable LOG_LEVEL is set.');
    }
  }

  async updateConfig(dto: SystemConfigDto): Promise<SystemConfigDto> {
    const oldConfig = await this.core.getConfig();

    try {
      await this.eventRepository.serverSendAsync(ServerAsyncEvent.CONFIG_VALIDATE, {
        newConfig: dto,
        oldConfig,
      });
    } catch (error) {
      this.logger.warn(`Unable to save system config due to a validation error: ${error}`);
      throw new BadRequestException(error instanceof Error ? error.message : error);
    }

    const newConfig = await this.core.updateConfig(dto);

    this.eventRepository.clientBroadcast(ClientEvent.CONFIG_UPDATE, {});
    this.eventRepository.serverSend(ServerEvent.CONFIG_UPDATE, null);

    if (oldConfig.machineLearning.clip.modelName !== newConfig.machineLearning.clip.modelName) {
      await this.smartInfoRepository.init(newConfig.machineLearning.clip.modelName);
    }
    return mapConfig(newConfig);
  }

  getStorageTemplateOptions(): SystemConfigTemplateStorageOptionDto {
    const options = new SystemConfigTemplateStorageOptionDto();

    options.dayOptions = supportedDayTokens;
    options.weekOptions = supportedWeekTokens;
    options.monthOptions = supportedMonthTokens;
    options.yearOptions = supportedYearTokens;
    options.hourOptions = supportedHourTokens;
    options.secondOptions = supportedSecondTokens;
    options.minuteOptions = supportedMinuteTokens;
    options.presetOptions = supportedPresetTokens;

    return options;
  }

  async getMapStyle(theme: 'light' | 'dark') {
    const { map } = await this.getConfig();
    const styleUrl = theme === 'dark' ? map.darkStyle : map.lightStyle;

    if (styleUrl) {
      return this.repository.fetchStyle(styleUrl);
    }

    return JSON.parse(await this.repository.readFile(`./resources/style-${theme}.json`));
  }

  async getCustomCss(): Promise<string> {
    const { theme } = await this.core.getConfig();
    return theme.customCss;
  }

  @OnServerEvent(ServerEvent.CONFIG_UPDATE)
  async onConfigUpdate() {
    await this.core.refreshConfig();
  }

  private setLogLevel({ logging }: SystemConfig) {
    const envLevel = this.getEnvLogLevel();
    const configLevel = logging.enabled ? logging.level : false;
    const level = envLevel ?? configLevel;
    this.logger.setLogLevel(level);
    this.logger.log(`LogLevel=${level} ${envLevel ? '(set via LOG_LEVEL)' : '(set via system config)'}`);
  }

  private getEnvLogLevel() {
    return process.env.LOG_LEVEL as LogLevel;
  }
}
