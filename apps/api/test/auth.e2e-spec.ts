import { INestApplication, ValidationPipe } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { AppModule } from "../src/app.module"

/**
 * End-to-end auth flow. Requires DATABASE_URL pointing at a migrated
 * PostgreSQL instance (see docker-compose.yml / CI workflow).
 */
describe("Auth (e2e)", () => {
  let app: INestApplication
  const email = `e2e_${Date.now()}@pexo.test`
  const username = `e2e_${Date.now()}`

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it("signs up, logs in, refreshes, and reads own profile", async () => {
    const signup = await request(app.getHttpServer())
      .post("/auth/signup")
      .send({ email, username, displayName: "E2E Tester", password: "Password123!" })
      .expect(201)
    expect(signup.body.accessToken).toBeDefined()

    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "Password123!" })
      .expect(201)
    const { accessToken, refreshToken } = login.body

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken })
      .expect(201)

    // rotated: the same refresh token must not work twice
    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken })
      .expect(401)

    const me = await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
    expect(me.body.email).toBe(email)
  })

  it("rejects wrong passwords", async () => {
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "WrongPassword!" })
      .expect(401)
  })
})
