import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { ReportesModule } from '../reportes/reportes.module';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { WhatsappService } from './whatsapp.service';
import { NotificacionHistorial } from './entities/notificacion-historial.entity';
import {
  WHATSAPP_ADAPTER,
  WhatsappAdapter,
} from './adapters/whatsapp.adapter';
import { WhatsappApiAdapter } from './adapters/whatsapp-api.adapter';
import { WhatsappLinkAdapter } from './adapters/whatsapp-link.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificacionHistorial]),
    ConfiguracionModule,
    ReportesModule,
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    WhatsappService,
    WhatsappApiAdapter,
    WhatsappLinkAdapter,
    {
      provide: WHATSAPP_ADAPTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): WhatsappAdapter => {
        const url = config.get<string>('WHATSAPP_API_URL');
        const token = config.get<string>('WHATSAPP_API_TOKEN');
        return url && token
          ? new WhatsappApiAdapter(config)
          : new WhatsappLinkAdapter();
      },
    },
  ],
  exports: [NotificacionesService, WhatsappService],
})
export class NotificacionesModule {}
