# Calendar of Rekt

## Bitcoin Extreme Crash Risk Forecast

**Live demo**: [Calendar of Rekt](https://ciphernom.github.io/bitcoinrektcalendar/)

## What is this?

Calendar of Rekt is a visualization tool that reveals the monthly probability of experiencing extreme Bitcoin price crashes (daily returns below the 1st percentile). Unlike typical price prediction models that focus solely on price appreciation, this tool helps you assess when you're most likely to get REKT.

### Key Features

- Monthly crash risk probabilities based on comprehensive historical Bitcoin price data
- Detailed historical crash events with news context and links
- Visualization of risk levels using a gradient color scale
- Mobile-responsive design

## How It Works

The risk forecasting model is built on a **Poisson-Gamma Bayesian model with seasonal adjustments**:

1. **Data Processing**:
   - Analyzes complete Bitcoin price history
   - Calculates log returns and identifies extreme events (below 1st percentile)
   - Groups data by Bitcoin halving epochs for more accurate thresholds

2. **Statistical Model**:
   - Uses a Poisson distribution to model the occurrence of rare crash events
   - Applies a Gamma prior distribution (parameters a₀=1.0, b₀=1.0)
   - Incorporates seasonal factors based on monthly historical crash frequencies
   - Sets forecast period τ=30 days

3. **Risk Formula**:
   ```
   risk = 1 - ((b0 + T) / (b0 + T + tau))^(a0*S_m + N)
   ```
   Where:
   - T = total observed days for the month
   - N = number of extreme events observed
   - S_m = seasonal factor for the month
   - a₀, b₀ = prior parameters
   - τ = forecast period

## Technical Details

- Built with vanilla JavaScript, HTML, and CSS
- No external libraries or frameworks required
- Data fetched directly from Coin Metrics GitHub repository
- Entirely client-side processing

## Development

### Prerequisites

- Basic understanding of HTML, CSS, and JavaScript
- Git for version control
- A modern web browser

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/ciphernom/bitcoinrektcalendar.git
   ```

2. Navigate to the project directory:
   ```
   cd bitcoinrektcalendar
   ```

3. Open `index.html` in your browser or use a local server.

### Customization

- Modify the `calculateRisk` function to adjust the risk model parameters
- Edit the `getKnownCrashInfo` function to add more detailed crash events
- Adjust the CSS variables in `:root` to change the color scheme

## Current Status

This project is currently in **BETA**. Expect potential issues with:
- Mobile responsiveness on certain devices
- Historical crash event data completeness
- Performance with extremely large datasets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Disclaimer

This tool is for educational and entertainment purposes only. It is not financial advice. Past performance does not guarantee future results. Always do your own research before making investment decisions.

## License

This project is licensed under a Commercial License. All rights reserved. 

No part of this software may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the creator, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.

For permission requests, please contact the repository owner.

## Support the Project

If you find this tool valuable, please consider donating:

**Bitcoin**: `bc1pfjhf946lwtjvzkkl965tdva3unvpa2n8plspns4aaej3pr6fuypsrx6svs`

## Acknowledgments

- Bitcoin price data provided by [Coin Metrics](https://github.com/coinmetrics/data)
- Inspired by the need for better risk assessment tools in cryptocurrency markets
