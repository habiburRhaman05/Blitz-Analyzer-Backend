export const corsConfig = {
  origin: ['http://localhost:3000',"https://ph-health-frontend.vercel.app"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
};
