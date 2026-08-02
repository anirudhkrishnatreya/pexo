import { ValidationPipe, VersioningType } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import helmet from "helmet"
import { AppModule } from "./app.module"
import { HttpExceptionFilter } from "./common/filters/http-exception.filter"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  app.enableCors({ origin: true, credentials: true })
  app.setGlobalPrefix("api")
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" })
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())

  const config = new DocumentBuilder()
    .setTitle("Pexo API")
    .setDescription("Move. Conquer. Level Up. — Pexo fitness ecosystem API")
    .setVersion("1.0")
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("docs", app, document)

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`Pexo API running on :${port} — Swagger at /docs`)
}

bootstrap()
