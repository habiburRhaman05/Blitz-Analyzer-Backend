import { toNodeHandler } from "better-auth/node";
import express, { type Express } from "express";
import { envConfig } from "./config/env";
import { auth } from "./lib/auth";
import { applyMiddleware } from "./middleware";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import indexRouter from "./routes/index.route";
import stripeRouter from "./modules/stripe/stripe.route";
import path from "path";
import { cwd } from "process";
const app: Express = express();



app.set("trust proxy", 1);

app.use("/api/v1/stripe",stripeRouter)
applyMiddleware(app);
app.use("/api/auth",toNodeHandler(auth))
app.use("/api/v1",indexRouter)
app.set('views',path.join(`${cwd()}/src/templates`));


app.get("/health",async (_req, res) =>{

  res.status(200).json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
});


app.get("/", (req, res) => {
  res.render("home");
});


export const startServer = async () => {

  try {
    const PORT = envConfig.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀Blitz Analyzer  Server is running on port ${PORT}`);
    })

  } catch (error) {
    console.error('❌ Error initializing app:', error);
    process.exit(1);
  }
};
app.use(notFound);
app.use(errorHandler);



export default app;



