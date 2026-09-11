import app from './app';
import { config } from './config/env';

app.listen(config.port, () => {
  console.log(`GharPay API server running on http://localhost:${config.port}`);
});
