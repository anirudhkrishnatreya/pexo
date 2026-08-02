import { Module } from "@nestjs/common"
import { TerritoriesModule } from "../territories/territories.module"
import { ActivitiesController } from "./activities.controller"
import { ActivitiesService } from "./activities.service"

@Module({
  imports: [TerritoriesModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
