#!/usr/bin/env python3
"""
Generate src/lib/market/universe.ts — the canonical, searchable asset universe
for Fiscus.

Sources:
  * US equities  : S&P 500 constituents (authoritative CSV from the
                   github.com/datasets/s-and-p-500-companies dataset, which
                   mirrors the Wikipedia S&P 500 list). 503 symbols.
  * NASDAQ-100   : exchange tagging applied to known NASDAQ-listed symbols.
  * ASX          : ASX 100 + notable mid-caps (hand-curated major-cap universe).
  * ETFs         : major US + ASX-listed ETFs.
  * Indices      : major global equity indices.
  * Commodities  : major metals + energy.
  * FX           : major + AUD-cross forex pairs.
  * Crypto       : major cryptocurrencies (USD).

Run:  python3 build_universe.py
Out:  ../Fiscus/src/lib/market/universe.ts  (when run from the outputs dir)
"""
import os, re, json

# ─────────────────────────── GICS sector → display ───────────────────────────
GICS = {
    "Information Technology": ("Tech",        "#a78bfa"),
    "Communication Services": ("Comms",       "#5b8af5"),
    "Health Care":            ("Healthcare",  "#22d48a"),
    "Financials":             ("Financials",  "#e8b84b"),
    "Consumer Discretionary": ("Consumer",    "#f97316"),
    "Consumer Staples":       ("Staples",     "#2ed494"),
    "Industrials":            ("Industrials", "#5b8af5"),
    "Energy":                 ("Energy",      "#f97316"),
    "Utilities":              ("Utilities",   "#2ed494"),
    "Materials":              ("Materials",   "#2ed494"),
    "Real Estate":            ("Real Estate", "#a78bfa"),
}

# Known NASDAQ-listed S&P 500 / NASDAQ-100 symbols (exchange tagging; the rest
# default to NYSE). Covers all NASDAQ-100 mega-caps. Display-only — Twelve Data
# uses the bare US ticker regardless of listing venue.
NASDAQ = set("""
AAPL MSFT NVDA AMZN META GOOGL GOOG AVGO TSLA COST NFLX ADBE PEP AMD CSCO TMUS
INTC INTU QCOM TXN AMGN HON AMAT ADP BKNG SBUX GILD ADI MDLZ REGN VRTX LRCX
PYPL SNPS CDNS MELI KLAC MAR ORLY CSX ASML MNST CTAS PANW NXPI FTNT PCAR PAYX
ROST ODFL MCHP CPRT KDP DXCM IDXX BIIB EXC EA CRWD DDOG TTD ANSS WBD FANG ON
GFS ZS TEAM DLTR WDAY SMCI MRNA ABNB COIN PLTR APP MDB SIRI ILMN ALGN ENPH
JD LCID WBA CHTR DASH GEHC TTWO CEG MRVL CSGP VRSK ANSS FAST VRSN SWKS NDAQ
HOOD GEN LULU LITE LITE WYNN SNDK QCOM CHRW JBHT EXPE EBAY
""".split())

# ─────────────────────────── S&P 500 (SYM|Name|GICS) ──────────────────────────
SP500 = """
MMM|3M|Industrials
AOS|A. O. Smith|Industrials
ABT|Abbott Laboratories|Health Care
ABBV|AbbVie|Health Care
ACN|Accenture|Information Technology
ADBE|Adobe Inc.|Information Technology
AMD|Advanced Micro Devices|Information Technology
AES|AES Corporation|Utilities
AFL|Aflac|Financials
A|Agilent Technologies|Health Care
APD|Air Products|Materials
ABNB|Airbnb|Consumer Discretionary
AKAM|Akamai Technologies|Information Technology
ALB|Albemarle Corporation|Materials
ARE|Alexandria Real Estate Equities|Real Estate
ALGN|Align Technology|Health Care
ALLE|Allegion|Industrials
LNT|Alliant Energy|Utilities
ALL|Allstate|Financials
GOOGL|Alphabet (Class A)|Communication Services
GOOG|Alphabet (Class C)|Communication Services
MO|Altria|Consumer Staples
AMZN|Amazon|Consumer Discretionary
AMCR|Amcor|Materials
AEE|Ameren|Utilities
AEP|American Electric Power|Utilities
AXP|American Express|Financials
AIG|American International Group|Financials
AMT|American Tower|Real Estate
AWK|American Water Works|Utilities
AMP|Ameriprise Financial|Financials
AME|Ametek|Industrials
AMGN|Amgen|Health Care
APH|Amphenol|Information Technology
ADI|Analog Devices|Information Technology
AON|Aon|Financials
APA|APA Corporation|Energy
APO|Apollo Global Management|Financials
AAPL|Apple Inc.|Information Technology
AMAT|Applied Materials|Information Technology
APP|AppLovin|Information Technology
APTV|Aptiv|Consumer Discretionary
ACGL|Arch Capital Group|Financials
ADM|Archer Daniels Midland|Consumer Staples
ARES|Ares Management|Financials
ANET|Arista Networks|Information Technology
AJG|Arthur J. Gallagher & Co.|Financials
AIZ|Assurant|Financials
T|AT&T|Communication Services
ATO|Atmos Energy|Utilities
ADSK|Autodesk|Information Technology
ADP|Automatic Data Processing|Industrials
AZO|AutoZone|Consumer Discretionary
AVB|AvalonBay Communities|Real Estate
AVY|Avery Dennison|Materials
AXON|Axon Enterprise|Industrials
BKR|Baker Hughes|Energy
BALL|Ball Corporation|Materials
BAC|Bank of America|Financials
BAX|Baxter International|Health Care
BDX|Becton Dickinson|Health Care
BRK.B|Berkshire Hathaway|Financials
BBY|Best Buy|Consumer Discretionary
TECH|Bio-Techne|Health Care
BIIB|Biogen|Health Care
BLK|BlackRock|Financials
BX|Blackstone|Financials
XYZ|Block, Inc.|Financials
BK|BNY Mellon|Financials
BA|Boeing|Industrials
BKNG|Booking Holdings|Consumer Discretionary
BSX|Boston Scientific|Health Care
BMY|Bristol Myers Squibb|Health Care
AVGO|Broadcom|Information Technology
BR|Broadridge Financial Solutions|Industrials
BRO|Brown & Brown|Financials
BF.B|Brown-Forman|Consumer Staples
BLDR|Builders FirstSource|Industrials
BG|Bunge Global|Consumer Staples
BXP|BXP, Inc.|Real Estate
CHRW|C.H. Robinson|Industrials
CDNS|Cadence Design Systems|Information Technology
CPT|Camden Property Trust|Real Estate
CPB|Campbell's Company|Consumer Staples
COF|Capital One|Financials
CAH|Cardinal Health|Health Care
CCL|Carnival|Consumer Discretionary
CARR|Carrier Global|Industrials
CVNA|Carvana|Consumer Discretionary
CASY|Casey's|Consumer Staples
CAT|Caterpillar|Industrials
CBOE|Cboe Global Markets|Financials
CBRE|CBRE Group|Real Estate
CDW|CDW Corporation|Information Technology
COR|Cencora|Health Care
CNC|Centene Corporation|Health Care
CNP|CenterPoint Energy|Utilities
CF|CF Industries|Materials
CRL|Charles River Laboratories|Health Care
SCHW|Charles Schwab|Financials
CHTR|Charter Communications|Communication Services
CVX|Chevron|Energy
CMG|Chipotle Mexican Grill|Consumer Discretionary
CB|Chubb Limited|Financials
CHD|Church & Dwight|Consumer Staples
CIEN|Ciena|Information Technology
CI|Cigna|Health Care
CINF|Cincinnati Financial|Financials
CTAS|Cintas|Industrials
CSCO|Cisco|Information Technology
C|Citigroup|Financials
CFG|Citizens Financial Group|Financials
CLX|Clorox|Consumer Staples
CME|CME Group|Financials
CMS|CMS Energy|Utilities
KO|Coca-Cola|Consumer Staples
CTSH|Cognizant|Information Technology
COHR|Coherent Corp.|Information Technology
COIN|Coinbase|Financials
CL|Colgate-Palmolive|Consumer Staples
CMCSA|Comcast|Communication Services
FIX|Comfort Systems USA|Industrials
CAG|Conagra Brands|Consumer Staples
COP|ConocoPhillips|Energy
ED|Consolidated Edison|Utilities
STZ|Constellation Brands|Consumer Staples
CEG|Constellation Energy|Utilities
COO|Cooper Companies|Health Care
CPRT|Copart|Industrials
GLW|Corning|Information Technology
CPAY|Corpay|Financials
CTVA|Corteva|Materials
CSGP|CoStar Group|Real Estate
COST|Costco|Consumer Staples
CTRA|Coterra|Energy
CRH|CRH plc|Materials
CRWD|CrowdStrike|Information Technology
CCI|Crown Castle|Real Estate
CSX|CSX Corporation|Industrials
CMI|Cummins|Industrials
CVS|CVS Health|Health Care
DHR|Danaher|Health Care
DRI|Darden Restaurants|Consumer Discretionary
DDOG|Datadog|Information Technology
DVA|DaVita|Health Care
DECK|Deckers Brands|Consumer Discretionary
DE|Deere & Company|Industrials
DELL|Dell Technologies|Information Technology
DAL|Delta Air Lines|Industrials
DVN|Devon Energy|Energy
DXCM|Dexcom|Health Care
FANG|Diamondback Energy|Energy
DLR|Digital Realty|Real Estate
DG|Dollar General|Consumer Staples
DLTR|Dollar Tree|Consumer Staples
D|Dominion Energy|Utilities
DPZ|Domino's|Consumer Discretionary
DASH|DoorDash|Consumer Discretionary
DOV|Dover Corporation|Industrials
DOW|Dow Inc.|Materials
DHI|D. R. Horton|Consumer Discretionary
DTE|DTE Energy|Utilities
DUK|Duke Energy|Utilities
DD|DuPont|Materials
ETN|Eaton Corporation|Industrials
EBAY|eBay|Consumer Discretionary
SATS|EchoStar|Communication Services
ECL|Ecolab|Materials
EIX|Edison International|Utilities
EW|Edwards Lifesciences|Health Care
EA|Electronic Arts|Communication Services
ELV|Elevance Health|Health Care
EME|Emcor|Industrials
EMR|Emerson Electric|Industrials
ETR|Entergy|Utilities
EOG|EOG Resources|Energy
EPAM|EPAM Systems|Information Technology
EQT|EQT Corporation|Energy
EFX|Equifax|Industrials
EQIX|Equinix|Real Estate
EQR|Equity Residential|Real Estate
ERIE|Erie Indemnity|Financials
ESS|Essex Property Trust|Real Estate
EL|Estee Lauder|Consumer Staples
EG|Everest Group|Financials
EVRG|Evergy|Utilities
ES|Eversource Energy|Utilities
EXC|Exelon|Utilities
EXE|Expand Energy|Energy
EXPE|Expedia Group|Consumer Discretionary
EXPD|Expeditors International|Industrials
EXR|Extra Space Storage|Real Estate
XOM|ExxonMobil|Energy
FFIV|F5, Inc.|Information Technology
FDS|FactSet|Financials
FICO|Fair Isaac|Information Technology
FAST|Fastenal|Industrials
FRT|Federal Realty Investment Trust|Real Estate
FDX|FedEx|Industrials
FIS|Fidelity National Information Services|Financials
FITB|Fifth Third Bancorp|Financials
FSLR|First Solar|Information Technology
FE|FirstEnergy|Utilities
FISV|Fiserv|Financials
F|Ford Motor Company|Consumer Discretionary
FTNT|Fortinet|Information Technology
FTV|Fortive|Industrials
FOXA|Fox Corporation (Class A)|Communication Services
FOX|Fox Corporation (Class B)|Communication Services
BEN|Franklin Resources|Financials
FCX|Freeport-McMoRan|Materials
GRMN|Garmin|Consumer Discretionary
IT|Gartner|Information Technology
GE|GE Aerospace|Industrials
GEHC|GE HealthCare|Health Care
GEV|GE Vernova|Industrials
GEN|Gen Digital|Information Technology
GNRC|Generac|Industrials
GD|General Dynamics|Industrials
GIS|General Mills|Consumer Staples
GM|General Motors|Consumer Discretionary
GPC|Genuine Parts Company|Consumer Discretionary
GILD|Gilead Sciences|Health Care
GPN|Global Payments|Financials
GL|Globe Life|Financials
GDDY|GoDaddy|Information Technology
GS|Goldman Sachs|Financials
HAL|Halliburton|Energy
HIG|Hartford|Financials
HAS|Hasbro|Consumer Discretionary
HCA|HCA Healthcare|Health Care
DOC|Healthpeak Properties|Real Estate
HSIC|Henry Schein|Health Care
HSY|Hershey Company|Consumer Staples
HPE|Hewlett Packard Enterprise|Information Technology
HLT|Hilton Worldwide|Consumer Discretionary
HD|Home Depot|Consumer Discretionary
HON|Honeywell|Industrials
HRL|Hormel Foods|Consumer Staples
HST|Host Hotels & Resorts|Real Estate
HWM|Howmet Aerospace|Industrials
HPQ|HP Inc.|Information Technology
HUBB|Hubbell|Industrials
HUM|Humana|Health Care
HBAN|Huntington Bancshares|Financials
HII|Huntington Ingalls Industries|Industrials
IBM|IBM|Information Technology
IEX|IDEX Corporation|Industrials
IDXX|Idexx Laboratories|Health Care
ITW|Illinois Tool Works|Industrials
INCY|Incyte|Health Care
IR|Ingersoll Rand|Industrials
PODD|Insulet Corporation|Health Care
INTC|Intel|Information Technology
IBKR|Interactive Brokers|Financials
ICE|Intercontinental Exchange|Financials
IFF|International Flavors & Fragrances|Materials
IP|International Paper|Materials
INTU|Intuit|Information Technology
ISRG|Intuitive Surgical|Health Care
IVZ|Invesco|Financials
INVH|Invitation Homes|Real Estate
IQV|IQVIA|Health Care
IRM|Iron Mountain|Real Estate
JBHT|J.B. Hunt|Industrials
JBL|Jabil|Information Technology
JKHY|Jack Henry & Associates|Financials
J|Jacobs Solutions|Industrials
JNJ|Johnson & Johnson|Health Care
JCI|Johnson Controls|Industrials
JPM|JPMorgan Chase|Financials
KVUE|Kenvue|Consumer Staples
KDP|Keurig Dr Pepper|Consumer Staples
KEY|KeyCorp|Financials
KEYS|Keysight Technologies|Information Technology
KMB|Kimberly-Clark|Consumer Staples
KIM|Kimco Realty|Real Estate
KMI|Kinder Morgan|Energy
KKR|KKR & Co.|Financials
KLAC|KLA Corporation|Information Technology
KHC|Kraft Heinz|Consumer Staples
KR|Kroger|Consumer Staples
LHX|L3Harris|Industrials
LH|Labcorp|Health Care
LRCX|Lam Research|Information Technology
LVS|Las Vegas Sands|Consumer Discretionary
LDOS|Leidos|Industrials
LEN|Lennar|Consumer Discretionary
LII|Lennox International|Industrials
LLY|Eli Lilly|Health Care
LIN|Linde plc|Materials
LYV|Live Nation Entertainment|Communication Services
LMT|Lockheed Martin|Industrials
L|Loews Corporation|Financials
LOW|Lowe's|Consumer Discretionary
LULU|Lululemon Athletica|Consumer Discretionary
LITE|Lumentum|Information Technology
LYB|LyondellBasell|Materials
MTB|M&T Bank|Financials
MPC|Marathon Petroleum|Energy
MAR|Marriott International|Consumer Discretionary
MRSH|Marsh McLennan|Financials
MLM|Martin Marietta Materials|Materials
MAS|Masco|Industrials
MA|Mastercard|Financials
MKC|McCormick & Company|Consumer Staples
MCD|McDonald's|Consumer Discretionary
MCK|McKesson|Health Care
MDT|Medtronic|Health Care
MRK|Merck & Co.|Health Care
META|Meta Platforms|Communication Services
MET|MetLife|Financials
MTD|Mettler Toledo|Health Care
MGM|MGM Resorts|Consumer Discretionary
MCHP|Microchip Technology|Information Technology
MU|Micron Technology|Information Technology
MSFT|Microsoft|Information Technology
MAA|Mid-America Apartment Communities|Real Estate
MRNA|Moderna|Health Care
TAP|Molson Coors Beverage|Consumer Staples
MDLZ|Mondelez International|Consumer Staples
MPWR|Monolithic Power Systems|Information Technology
MNST|Monster Beverage|Consumer Staples
MCO|Moody's Corporation|Financials
MS|Morgan Stanley|Financials
MOS|Mosaic Company|Materials
MSI|Motorola Solutions|Information Technology
MSCI|MSCI Inc.|Financials
NDAQ|Nasdaq, Inc.|Financials
NTAP|NetApp|Information Technology
NFLX|Netflix|Communication Services
NEM|Newmont|Materials
NWSA|News Corp (Class A)|Communication Services
NWS|News Corp (Class B)|Communication Services
NEE|NextEra Energy|Utilities
NKE|Nike, Inc.|Consumer Discretionary
NI|NiSource|Utilities
NDSN|Nordson Corporation|Industrials
NSC|Norfolk Southern|Industrials
NTRS|Northern Trust|Financials
NOC|Northrop Grumman|Industrials
NCLH|Norwegian Cruise Line Holdings|Consumer Discretionary
NRG|NRG Energy|Utilities
NUE|Nucor|Materials
NVDA|Nvidia|Information Technology
NVR|NVR, Inc.|Consumer Discretionary
NXPI|NXP Semiconductors|Information Technology
ORLY|O'Reilly Automotive|Consumer Discretionary
OXY|Occidental Petroleum|Energy
ODFL|Old Dominion|Industrials
OMC|Omnicom Group|Communication Services
ON|ON Semiconductor|Information Technology
OKE|Oneok|Energy
ORCL|Oracle|Information Technology
OTIS|Otis Worldwide|Industrials
PCAR|Paccar|Industrials
PKG|Packaging Corporation of America|Materials
PLTR|Palantir Technologies|Information Technology
PANW|Palo Alto Networks|Information Technology
PSKY|Paramount Skydance|Communication Services
PH|Parker Hannifin|Industrials
PAYX|Paychex|Industrials
PYPL|PayPal|Financials
PNR|Pentair|Industrials
PEP|PepsiCo|Consumer Staples
PFE|Pfizer|Health Care
PCG|PG&E Corporation|Utilities
PM|Philip Morris International|Consumer Staples
PSX|Phillips 66|Energy
PNW|Pinnacle West Capital|Utilities
PNC|PNC Financial Services|Financials
POOL|Pool Corporation|Consumer Discretionary
PPG|PPG Industries|Materials
PPL|PPL Corporation|Utilities
PFG|Principal Financial Group|Financials
PG|Procter & Gamble|Consumer Staples
PGR|Progressive Corporation|Financials
PLD|Prologis|Real Estate
PRU|Prudential Financial|Financials
PEG|Public Service Enterprise Group|Utilities
PTC|PTC Inc.|Information Technology
PSA|Public Storage|Real Estate
PHM|PulteGroup|Consumer Discretionary
PWR|Quanta Services|Industrials
QCOM|Qualcomm|Information Technology
DGX|Quest Diagnostics|Health Care
Q|Qnity Electronics|Information Technology
RL|Ralph Lauren Corporation|Consumer Discretionary
RJF|Raymond James Financial|Financials
RTX|RTX Corporation|Industrials
O|Realty Income|Real Estate
REG|Regency Centers|Real Estate
REGN|Regeneron Pharmaceuticals|Health Care
RF|Regions Financial|Financials
RSG|Republic Services|Industrials
RMD|ResMed|Health Care
RVTY|Revvity|Health Care
HOOD|Robinhood Markets|Financials
ROK|Rockwell Automation|Industrials
ROL|Rollins, Inc.|Industrials
ROP|Roper Technologies|Information Technology
ROST|Ross Stores|Consumer Discretionary
RCL|Royal Caribbean Group|Consumer Discretionary
SPGI|S&P Global|Financials
CRM|Salesforce|Information Technology
SNDK|Sandisk|Information Technology
SBAC|SBA Communications|Real Estate
SLB|Schlumberger|Energy
STX|Seagate Technology|Information Technology
SRE|Sempra|Utilities
NOW|ServiceNow|Information Technology
SHW|Sherwin-Williams|Materials
SPG|Simon Property Group|Real Estate
SWKS|Skyworks Solutions|Information Technology
SJM|J.M. Smucker Company|Consumer Staples
SW|Smurfit Westrock|Materials
SNA|Snap-on|Industrials
SOLV|Solventum|Health Care
SO|Southern Company|Utilities
LUV|Southwest Airlines|Industrials
SWK|Stanley Black & Decker|Industrials
SBUX|Starbucks|Consumer Discretionary
STT|State Street Corporation|Financials
STLD|Steel Dynamics|Materials
STE|Steris|Health Care
SYK|Stryker Corporation|Health Care
SMCI|Supermicro|Information Technology
SYF|Synchrony Financial|Financials
SNPS|Synopsys|Information Technology
SYY|Sysco|Consumer Staples
TMUS|T-Mobile US|Communication Services
TROW|T. Rowe Price|Financials
TTWO|Take-Two Interactive|Communication Services
TPR|Tapestry, Inc.|Consumer Discretionary
TRGP|Targa Resources|Energy
TGT|Target Corporation|Consumer Staples
TEL|TE Connectivity|Information Technology
TDY|Teledyne Technologies|Information Technology
TER|Teradyne|Information Technology
TSLA|Tesla, Inc.|Consumer Discretionary
TXN|Texas Instruments|Information Technology
TPL|Texas Pacific Land Corporation|Energy
TXT|Textron|Industrials
TMO|Thermo Fisher Scientific|Health Care
TJX|TJX Companies|Consumer Discretionary
TKO|TKO Group Holdings|Communication Services
TTD|Trade Desk|Communication Services
TSCO|Tractor Supply|Consumer Discretionary
TT|Trane Technologies|Industrials
TDG|TransDigm Group|Industrials
TRV|Travelers Companies|Financials
TRMB|Trimble Inc.|Information Technology
TFC|Truist Financial|Financials
TYL|Tyler Technologies|Information Technology
TSN|Tyson Foods|Consumer Staples
USB|U.S. Bancorp|Financials
UBER|Uber|Industrials
UDR|UDR, Inc.|Real Estate
ULTA|Ulta Beauty|Consumer Discretionary
UNP|Union Pacific|Industrials
UAL|United Airlines Holdings|Industrials
UPS|United Parcel Service|Industrials
URI|United Rentals|Industrials
UNH|UnitedHealth Group|Health Care
UHS|Universal Health Services|Health Care
VLO|Valero Energy|Energy
VTR|Ventas|Real Estate
VLTO|Veralto|Industrials
VRSN|Verisign|Information Technology
VRSK|Verisk Analytics|Industrials
VZ|Verizon|Communication Services
VRTX|Vertex Pharmaceuticals|Health Care
VRT|Vertiv|Industrials
VTRS|Viatris|Health Care
VICI|Vici Properties|Real Estate
V|Visa Inc.|Financials
VST|Vistra Corp.|Utilities
VMC|Vulcan Materials Company|Materials
WRB|W. R. Berkley Corporation|Financials
GWW|W. W. Grainger|Industrials
WAB|Wabtec|Industrials
WMT|Walmart|Consumer Staples
DIS|Walt Disney Company|Communication Services
WBD|Warner Bros. Discovery|Communication Services
WM|Waste Management|Industrials
WAT|Waters Corporation|Health Care
WEC|WEC Energy Group|Utilities
WFC|Wells Fargo|Financials
WELL|Welltower|Real Estate
WST|West Pharmaceutical Services|Health Care
WDC|Western Digital|Information Technology
WY|Weyerhaeuser|Real Estate
WSM|Williams-Sonoma|Consumer Discretionary
WMB|Williams Companies|Energy
WTW|Willis Towers Watson|Financials
WDAY|Workday, Inc.|Information Technology
WYNN|Wynn Resorts|Consumer Discretionary
XEL|Xcel Energy|Utilities
XYL|Xylem Inc.|Industrials
YUM|Yum! Brands|Consumer Discretionary
ZBRA|Zebra Technologies|Information Technology
ZBH|Zimmer Biomet|Health Care
ZTS|Zoetis|Health Care
"""

# Extra mega/large-cap NASDAQ names not in the S&P 500 list but commonly searched
US_EXTRA = """
ASML|ASML Holding|Information Technology|NASDAQ
MELI|MercadoLibre|Consumer Discretionary|NASDAQ
PDD|PDD Holdings|Consumer Discretionary|NASDAQ
JD|JD.com|Consumer Discretionary|NASDAQ
ZS|Zscaler|Information Technology|NASDAQ
TEAM|Atlassian|Information Technology|NASDAQ
MDB|MongoDB|Information Technology|NASDAQ
SNOW|Snowflake|Information Technology|NYSE
NET|Cloudflare|Information Technology|NYSE
SHOP|Shopify|Information Technology|NYSE
SQ|Block (Square)|Financials|NYSE
RBLX|Roblox|Communication Services|NYSE
U|Unity Software|Information Technology|NYSE
RIVN|Rivian Automotive|Consumer Discretionary|NASDAQ
LCID|Lucid Group|Consumer Discretionary|NASDAQ
NIO|NIO Inc.|Consumer Discretionary|NYSE
SOFI|SoFi Technologies|Financials|NASDAQ
AFRM|Affirm Holdings|Financials|NASDAQ
ROKU|Roku|Communication Services|NASDAQ
PINS|Pinterest|Communication Services|NYSE
SNAP|Snap Inc.|Communication Services|NYSE
SPOT|Spotify Technology|Communication Services|NYSE
ABNB|Airbnb|Consumer Discretionary|NASDAQ
DKNG|DraftKings|Consumer Discretionary|NASDAQ
ZM|Zoom Communications|Information Technology|NASDAQ
DOCU|DocuSign|Information Technology|NASDAQ
TWLO|Twilio|Information Technology|NYSE
OKTA|Okta|Information Technology|NASDAQ
"""

# ─────────────────────────── ASX (TICKER|Name|Sector) ─────────────────────────
# ASX 100 + notable mid-caps. Major-cap searchable universe.
ASX = """
CBA|Commonwealth Bank|Banking
NAB|National Australia Bank|Banking
WBC|Westpac Banking|Banking
ANZ|ANZ Group|Banking
MQG|Macquarie Group|Finance
BEN|Bendigo & Adelaide Bank|Banking
BOQ|Bank of Queensland|Banking
BHP|BHP Group|Mining
RIO|Rio Tinto|Mining
FMG|Fortescue|Mining
S32|South32|Mining
MIN|Mineral Resources|Mining
NCM|Newcrest Mining|Gold
NST|Northern Star Resources|Gold
EVN|Evolution Mining|Gold
PLS|Pilbara Minerals|Lithium
IGO|IGO Limited|Lithium
LTR|Liontown Resources|Lithium
LYC|Lynas Rare Earths|Materials
PLS|Pilbara Minerals|Lithium
WDS|Woodside Energy|Energy
STO|Santos|Energy
WHC|Whitehaven Coal|Energy
NHC|New Hope Corporation|Energy
ORG|Origin Energy|Energy
AGL|AGL Energy|Energy
APA|APA Group|Energy
BOE|Boss Energy|Uranium
PDN|Paladin Energy|Uranium
CSL|CSL Limited|Healthcare
RMD|ResMed|Healthcare
COH|Cochlear|Healthcare
PME|Pro Medicus|Healthcare
SHL|Sonic Healthcare|Healthcare
RHC|Ramsay Health Care|Healthcare
FPH|Fisher & Paykel Healthcare|Healthcare
TLX|Telix Pharmaceuticals|Healthcare
WOW|Woolworths Group|Consumer
COL|Coles Group|Consumer
WES|Wesfarmers|Retail
JBH|JB Hi-Fi|Retail
HVN|Harvey Norman|Retail
EDV|Endeavour Group|Consumer
TWE|Treasury Wine Estates|Consumer
A2M|The a2 Milk Company|Consumer
ALL|Aristocrat Leisure|Gaming
TAH|Tabcorp Holdings|Gaming
TLC|Lottery Corporation|Gaming
FLT|Flight Centre|Travel
WEB|Web Travel Group|Travel
QAN|Qantas Airways|Travel
SGR|Star Entertainment|Gaming
CWN|Crown Resorts|Gaming
TLS|Telstra Group|Telecom
TPG|TPG Telecom|Telecom
CAR|CAR Group|Tech
REA|REA Group|Tech
XRO|Xero|Tech
WTC|WiseTech Global|Tech
SEK|Seek|Tech
ALU|Altium|Tech
NXT|NextDC|Tech
APX|Appen|Tech
TNE|Technology One|Tech
NWL|Netwealth Group|Finance
HUB|Hub24|Finance
ASX|ASX Limited|Exchange
COG|COG Financial|Finance
QBE|QBE Insurance|Insurance
SUN|Suncorp Group|Insurance
IAG|Insurance Australia Group|Insurance
MPL|Medibank Private|Insurance
NHF|NIB Holdings|Insurance
AMP|AMP Limited|Finance
IFL|Insignia Financial|Finance
PPT|Perpetual|Finance
MFG|Magellan Financial|Finance
PNI|Pinnacle Investment|Finance
GMG|Goodman Group|Property
SCG|Scentre Group|Property
SGP|Stockland|Property
GPT|GPT Group|Property
MGR|Mirvac Group|Property
DXS|Dexus|Property
VCX|Vicinity Centres|Property
CHC|Charter Hall Group|Property
LLC|Lendlease Group|Property
TCL|Transurban Group|Infrastructure
ALX|Atlas Arteria|Infrastructure
AIA|Auckland Airport|Infrastructure
QUB|Qube Holstein|Infrastructure
BXB|Brambles|Industrials
AMC|Amcor|Materials
ORA|Orora|Materials
JHX|James Hardie|Materials
BLD|Boral|Materials
CSR|CSR Limited|Materials
ABC|Adbri|Materials
RWC|Reliance Worldwide|Industrials
ALD|Ampol|Energy
VEA|Viva Energy|Energy
IPL|Incitec Pivot|Materials
ORI|Orica|Materials
NUF|Nufarm|Materials
ELD|Elders|Consumer
GNC|GrainCorp|Consumer
BPT|Beach Energy|Energy
KAR|Karoon Energy|Energy
CGF|Challenger|Finance
BSL|BlueScope Steel|Materials
SFR|Sandfire Resources|Mining
29M|29Metals|Mining
CIA|Champion Iron|Mining
DRR|Deterra Royalties|Mining
ILU|Iluka Resources|Materials
SGM|Sims Limited|Materials
ALQ|ALS Limited|Industrials
CPU|Computershare|Tech
IRE|Iress|Tech
IEL|IDP Education|Education
EVT|EVT Limited|Consumer
DMP|Domino's Pizza Enterprises|Consumer
BRG|Breville Group|Consumer
PMV|Premier Investments|Retail
LOV|Lovisa Holdings|Retail
SUL|Super Retail Group|Retail
ARB|ARB Corporation|Consumer
BAP|Bapcor|Consumer
NEC|Nine Entertainment|Media
SXL|Southern Cross Media|Media
SWM|Seven West Media|Media
CWY|Cleanaway Waste|Industrials
DOW|Downer EDI|Industrials
SVW|Seven Group Holdings|Industrials
MND|Monadelphous Group|Industrials
WOR|Worley|Energy
ALL|Aristocrat Leisure|Gaming
ZIP|Zip Co|Fintech
"""

# ─────────────────────────── ETFs ─────────────────────────────────────────────
# ticker|name|exchange|currency|tdSymbol(optional, '' = use ticker for US)
ETFS = """
SPY|SPDR S&P 500 ETF Trust|NYSEARCA|USD|SPY
VOO|Vanguard S&P 500 ETF|NYSEARCA|USD|VOO
IVV|iShares Core S&P 500 ETF|NYSEARCA|USD|IVV
VTI|Vanguard Total Stock Market ETF|NYSEARCA|USD|VTI
QQQ|Invesco QQQ Trust (Nasdaq 100)|NASDAQ|USD|QQQ
DIA|SPDR Dow Jones Industrial Average ETF|NYSEARCA|USD|DIA
IWM|iShares Russell 2000 ETF|NYSEARCA|USD|IWM
VUG|Vanguard Growth ETF|NYSEARCA|USD|VUG
VTV|Vanguard Value ETF|NYSEARCA|USD|VTV
VEA|Vanguard FTSE Developed Markets ETF|NYSEARCA|USD|VEA
VWO|Vanguard FTSE Emerging Markets ETF|NYSEARCA|USD|VWO
VXUS|Vanguard Total International Stock ETF|NASDAQ|USD|VXUS
EFA|iShares MSCI EAFE ETF|NYSEARCA|USD|EFA
EEM|iShares MSCI Emerging Markets ETF|NYSEARCA|USD|EEM
IEMG|iShares Core MSCI Emerging Markets ETF|NYSEARCA|USD|IEMG
SCHD|Schwab US Dividend Equity ETF|NYSEARCA|USD|SCHD
VIG|Vanguard Dividend Appreciation ETF|NYSEARCA|USD|VIG
VYM|Vanguard High Dividend Yield ETF|NYSEARCA|USD|VYM
JEPI|JPMorgan Equity Premium Income ETF|NYSEARCA|USD|JEPI
AGG|iShares Core US Aggregate Bond ETF|NYSEARCA|USD|AGG
BND|Vanguard Total Bond Market ETF|NASDAQ|USD|BND
TLT|iShares 20+ Year Treasury Bond ETF|NASDAQ|USD|TLT
HYG|iShares iBoxx High Yield Corporate Bond ETF|NYSEARCA|USD|HYG
LQD|iShares iBoxx Investment Grade Corporate Bond ETF|NYSEARCA|USD|LQD
GLD|SPDR Gold Shares|NYSEARCA|USD|GLD
SLV|iShares Silver Trust|NYSEARCA|USD|SLV
SMH|VanEck Semiconductor ETF|NASDAQ|USD|SMH
SOXX|iShares Semiconductor ETF|NASDAQ|USD|SOXX
XLK|Technology Select Sector SPDR Fund|NYSEARCA|USD|XLK
XLF|Financial Select Sector SPDR Fund|NYSEARCA|USD|XLF
XLE|Energy Select Sector SPDR Fund|NYSEARCA|USD|XLE
XLV|Health Care Select Sector SPDR Fund|NYSEARCA|USD|XLV
ARKK|ARK Innovation ETF|NYSEARCA|USD|ARKK
VGT|Vanguard Information Technology ETF|NYSEARCA|USD|VGT
VAS|Vanguard Australian Shares Index ETF|ASX|AUD|
VGS|Vanguard MSCI Index International Shares ETF|ASX|AUD|
A200|BetaShares Australia 200 ETF|ASX|AUD|
IOZ|iShares Core S&P/ASX 200 ETF|ASX|AUD|
STW|SPDR S&P/ASX 200 Fund|ASX|AUD|
VHY|Vanguard Australian Shares High Yield ETF|ASX|AUD|
NDQ|BetaShares Nasdaq 100 ETF|ASX|AUD|
VTS|Vanguard US Total Market Shares ETF|ASX|AUD|
VEU|Vanguard All-World ex-US Shares ETF|ASX|AUD|
IVV.AX|iShares S&P 500 ETF (ASX)|ASX|AUD|
VAP|Vanguard Australian Property Securities ETF|ASX|AUD|
ETHI|BetaShares Global Sustainability Leaders ETF|ASX|AUD|
HACK|BetaShares Global Cybersecurity ETF|ASX|AUD|
DHHF|BetaShares Diversified All Growth ETF|ASX|AUD|
VDHG|Vanguard Diversified High Growth ETF|ASX|AUD|
GOLD.AX|Global X Physical Gold (ASX)|ASX|AUD|
"""

# ─────────────────────────── Indices ──────────────────────────────────────────
# ticker|name|exchange|currency|tdSymbol(may be unsupported on free tier)
INDICES = """
SPX|S&P 500 Index|INDEX|USD|SPX
NDX|Nasdaq 100 Index|INDEX|USD|NDX
IXIC|Nasdaq Composite Index|INDEX|USD|IXIC
DJI|Dow Jones Industrial Average|INDEX|USD|DJI
RUT|Russell 2000 Index|INDEX|USD|RUT
VIX|CBOE Volatility Index|INDEX|USD|VIX
XJO|S&P/ASX 200 Index|INDEX|AUD|XJO
XAO|S&P/ASX All Ordinaries Index|INDEX|AUD|XAO
FTSE|FTSE 100 Index|INDEX|GBP|FTSE
GDAXI|DAX Index|INDEX|EUR|DAX
FCHI|CAC 40 Index|INDEX|EUR|CAC
N225|Nikkei 225 Index|INDEX|JPY|N225
HSI|Hang Seng Index|INDEX|HKD|HSI
STOXX|EURO STOXX 50 Index|INDEX|EUR|STOXX50E
"""

# ─────────────────────────── Commodities ──────────────────────────────────────
# ticker|name|unit|tdSymbol
COMMODITIES = """
GOLD|Gold Spot|/oz|XAU/USD
SILVER|Silver Spot|/oz|XAG/USD
PLATINUM|Platinum Spot|/oz|XPT/USD
PALLADIUM|Palladium Spot|/oz|XPD/USD
OIL|Crude Oil (WTI)|/bbl|WTI/USD
BRENT|Crude Oil (Brent)|/bbl|BRENT/USD
NATGAS|Natural Gas|/MMBtu|NG/USD
COPPER|Copper|/lb|XCU/USD
"""

# ─────────────────────────── FX ───────────────────────────────────────────────
# ticker|name|tdSymbol
FX = """
AUDUSD|Australian Dollar / US Dollar|AUD/USD
EURUSD|Euro / US Dollar|EUR/USD
GBPUSD|British Pound / US Dollar|GBP/USD
USDJPY|US Dollar / Japanese Yen|USD/JPY
USDCNY|US Dollar / Chinese Yuan|USD/CNY
USDCAD|US Dollar / Canadian Dollar|USD/CAD
USDCHF|US Dollar / Swiss Franc|USD/CHF
NZDUSD|New Zealand Dollar / US Dollar|NZD/USD
AUDEUR|Australian Dollar / Euro|AUD/EUR
AUDJPY|Australian Dollar / Japanese Yen|AUD/JPY
AUDGBP|Australian Dollar / British Pound|AUD/GBP
AUDNZD|Australian Dollar / New Zealand Dollar|AUD/NZD
EURGBP|Euro / British Pound|EUR/GBP
"""

# ─────────────────────────── Crypto ───────────────────────────────────────────
# ticker|name|tdSymbol
CRYPTO = """
BTC|Bitcoin|BTC/USD
ETH|Ethereum|ETH/USD
SOL|Solana|SOL/USD
XRP|XRP|XRP/USD
BNB|BNB|BNB/USD
ADA|Cardano|ADA/USD
DOGE|Dogecoin|DOGE/USD
DOT|Polkadot|DOT/USD
MATIC|Polygon|MATIC/USD
LTC|Litecoin|LTC/USD
AVAX|Avalanche|AVAX/USD
LINK|Chainlink|LINK/USD
TRX|TRON|TRX/USD
BCH|Bitcoin Cash|BCH/USD
XLM|Stellar|XLM/USD
UNI|Uniswap|UNI/USD
ATOM|Cosmos|ATOM/USD
"""

# ─────────────────────────── Aliases (common-name → ticker) ───────────────────
ALIASES = {
    "apple": "AAPL", "google": "GOOGL", "alphabet": "GOOGL", "microsoft": "MSFT",
    "tesla": "TSLA", "nvidia": "NVDA", "amazon": "AMZN", "meta": "META",
    "facebook": "META", "instagram": "META", "netflix": "NFLX", "disney": "DIS",
    "berkshire": "BRK.B", "berkshire hathaway": "BRK.B", "warren buffett": "BRK.B",
    "jpmorgan": "JPM", "jp morgan": "JPM", "coca cola": "KO", "coke": "KO",
    "mcdonalds": "MCD", "walmart": "WMT", "visa": "V", "mastercard": "MA",
    "paypal": "PYPL", "starbucks": "SBUX", "boeing": "BA", "intel": "INTC",
    "amd": "AMD", "broadcom": "AVGO", "oracle": "ORCL", "salesforce": "CRM",
    "qualcomm": "QCOM", "ford": "F", "general motors": "GM", "pfizer": "PFE",
    "eli lilly": "LLY", "lilly": "LLY", "johnson and johnson": "JNJ",
    "exxon": "XOM", "exxonmobil": "XOM", "chevron": "CVX", "palantir": "PLTR",
    "uber": "UBER", "airbnb": "ABNB", "coinbase": "COIN", "robinhood": "HOOD",
    "costco": "COST", "home depot": "HD", "nike": "NKE", "pepsi": "PEP",
    "pepsico": "PEP", "adobe": "ADBE", "ibm": "IBM", "shopify": "SHOP",
    "spotify": "SPOT", "snowflake": "SNOW", "cloudflare": "NET", "block": "XYZ",
    "square": "XYZ", "micron": "MU", "arm": "ARM",
    # ASX
    "commonwealth bank": "CBA", "commbank": "CBA", "comm bank": "CBA",
    "westpac": "WBC", "national australia bank": "NAB", "nab bank": "NAB",
    "anz bank": "ANZ", "macquarie": "MQG", "bhp billiton": "BHP",
    "rio tinto": "RIO", "fortescue": "FMG", "woodside": "WDS", "santos": "STO",
    "telstra": "TLS", "woolworths": "WOW", "coles": "COL", "wesfarmers": "WES",
    "qantas": "QAN", "xero": "XRO", "wisetech": "WTC", "csl limited": "CSL",
    "newcrest": "NCM", "northern star": "NST", "pilbara": "PLS",
    "pilbara minerals": "PLS", "transurban": "TCL", "goodman": "GMG",
    "afterpay": "XYZ", "rea group": "REA", "realestate": "REA",
    # ETFs / indices / common phrases
    "s&p 500": "SPX", "s&p500": "SPX", "sp500": "SPX", "sandp 500": "SPX",
    "s and p 500": "SPX", "spx500": "SPX",
    "nasdaq 100": "NDX", "nasdaq100": "NDX", "nasdaq composite": "IXIC",
    "nasdaq": "IXIC", "dow jones": "DJI", "dow": "DJI", "the dow": "DJI",
    "russell 2000": "RUT", "russell": "RUT", "vix": "VIX",
    "asx 200": "XJO", "asx200": "XJO", "all ordinaries": "XAO",
    "all ords": "XAO", "ftse 100": "FTSE", "ftse": "FTSE", "dax": "GDAXI",
    "nikkei": "N225", "nikkei 225": "N225", "hang seng": "HSI", "cac 40": "FCHI",
    "euro stoxx 50": "STOXX", "stoxx 50": "STOXX",
    "spdr": "SPY", "qqq": "QQQ", "triple q": "QQQ",
    # Commodities
    "gold": "GOLD", "gold price": "GOLD", "xau": "GOLD", "xauusd": "GOLD",
    "silver": "SILVER", "xag": "SILVER", "platinum": "PLATINUM",
    "palladium": "PALLADIUM", "oil": "OIL", "crude": "OIL", "crude oil": "OIL",
    "wti": "OIL", "wti crude": "OIL", "brent": "BRENT", "brent crude": "BRENT",
    "natural gas": "NATGAS", "natgas": "NATGAS", "gas": "NATGAS",
    "copper": "COPPER",
    # FX
    "aud/usd": "AUDUSD", "audusd": "AUDUSD", "aud usd": "AUDUSD",
    "aussie dollar": "AUDUSD", "australian dollar": "AUDUSD", "aud": "AUDUSD",
    "eur/usd": "EURUSD", "eurusd": "EURUSD", "euro": "EURUSD",
    "gbp/usd": "GBPUSD", "gbpusd": "GBPUSD", "pound": "GBPUSD", "cable": "GBPUSD",
    "usd/jpy": "USDJPY", "usdjpy": "USDJPY", "yen": "USDJPY",
    "nzd/usd": "NZDUSD", "kiwi": "NZDUSD",
    # Crypto
    "bitcoin": "BTC", "btc": "BTC", "ethereum": "ETH", "ether": "ETH",
    "eth": "ETH", "solana": "SOL", "ripple": "XRP", "xrp": "XRP",
    "cardano": "ADA", "dogecoin": "DOGE", "doge": "DOGE", "polkadot": "DOT",
    "polygon": "MATIC", "litecoin": "LTC", "avalanche": "AVAX",
    "chainlink": "LINK", "binance coin": "BNB", "bnb": "BNB",
}

# ─────────────────────────── Build ────────────────────────────────────────────

assets = {}   # ticker -> dict (dedup by ticker; first wins)

def add(a):
    t = a["ticker"]
    if t in assets:
        return
    assets[t] = a

def parse_lines(block):
    for ln in block.strip().splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#"):
            continue
        yield [p.strip() for p in ln.split("|")]

# US equities (S&P 500)
for sym, name, gics in parse_lines(SP500):
    label, color = GICS.get(gics, ("Equities", "#5b8af5"))
    exch = "NASDAQ" if sym in NASDAQ else "NYSE"
    add({"ticker": sym, "name": name, "exchange": exch, "type": "STOCK",
         "sector": label, "sectorColor": color, "currency": "USD", "tdSymbol": sym})

# US extra
for sym, name, gics, exch in parse_lines(US_EXTRA):
    label, color = GICS.get(gics, ("Equities", "#5b8af5"))
    add({"ticker": sym, "name": name, "exchange": exch, "type": "STOCK",
         "sector": label, "sectorColor": color, "currency": "USD", "tdSymbol": sym})

# ASX equities (no live tdSymbol on free tier; Stooq attempted at runtime)
ASX_COLOR = {
    "Banking": "#5b8af5", "Finance": "#e8b84b", "Mining": "#2ed494",
    "Gold": "#e8b84b", "Lithium": "#22d48a", "Uranium": "#f97316",
    "Energy": "#f97316", "Healthcare": "#22d48a", "Consumer": "#22d48a",
    "Retail": "#f97316", "Tech": "#a78bfa", "Telecom": "#5b8af5",
    "Property": "#a78bfa", "Infrastructure": "#f97316", "Insurance": "#5b8af5",
    "Materials": "#2ed494", "Industrials": "#5b8af5", "Gaming": "#ff4f4f",
    "Travel": "#f97316", "Media": "#5b8af5", "Education": "#a78bfa",
    "Exchange": "#a78bfa", "Fintech": "#ff4f4f",
}
for tic, name, sector in parse_lines(ASX):
    color = ASX_COLOR.get(sector, "#5b8af5")
    add({"ticker": tic, "name": name, "exchange": "ASX", "type": "STOCK",
         "sector": sector, "sectorColor": color, "currency": "AUD", "tdSymbol": None})

# ETFs
for tic, name, exch, cur, td in parse_lines(ETFS):
    add({"ticker": tic, "name": name, "exchange": exch, "type": "ETF",
         "sector": "ETF", "sectorColor": "#5b8af5", "currency": cur,
         "tdSymbol": (td or None)})

# Indices
for tic, name, exch, cur, td in parse_lines(INDICES):
    add({"ticker": tic, "name": name, "exchange": exch, "type": "INDEX",
         "sector": "Index", "sectorColor": "#e8b84b", "currency": cur,
         "tdSymbol": td})

# Commodities
for tic, name, unit, td in parse_lines(COMMODITIES):
    add({"ticker": tic, "name": name, "exchange": "Commodity", "type": "COMMODITY",
         "sector": "Commodities", "sectorColor": "#e8b84b", "currency": "USD",
         "tdSymbol": td, "unit": unit})

# FX
for tic, name, td in parse_lines(FX):
    add({"ticker": tic, "name": name, "exchange": "Forex", "type": "FX",
         "sector": "FX", "sectorColor": "#22d48a", "currency": "USD", "tdSymbol": td})

# Crypto
for tic, name, td in parse_lines(CRYPTO):
    add({"ticker": tic, "name": name, "exchange": "Crypto", "type": "CRYPTO",
         "sector": "Crypto", "sectorColor": "#f97316", "currency": "USD", "tdSymbol": td})

# Drop alias keys that don't resolve to a known ticker
aliases = {k: v for k, v in ALIASES.items() if v in assets}

ordered = list(assets.values())

# ─────────────────────────── Emit TypeScript ──────────────────────────────────
def ts_str(s):
    return json.dumps(s, ensure_ascii=False)

lines = []
lines.append("// AUTO-GENERATED by scripts/build_universe.py — do not edit by hand.")
lines.append("// Sources: S&P 500 constituents (datasets/s-and-p-500-companies),")
lines.append("// hand-curated ASX 100+ majors, major US/ASX ETFs, global indices,")
lines.append("// commodities, forex pairs and crypto. See PRODUCTION_READINESS_AUDIT.md.")
lines.append("")
lines.append("export type AssetType = 'STOCK' | 'ETF' | 'INDEX' | 'COMMODITY' | 'FX' | 'CRYPTO'")
lines.append("")
lines.append("export interface UniverseAsset {")
lines.append("  ticker: string")
lines.append("  name: string")
lines.append("  exchange: string")
lines.append("  type: AssetType")
lines.append("  sector: string")
lines.append("  sectorColor: string")
lines.append("  currency: string")
lines.append("  /** Twelve Data symbol for live quotes, or null if no free-tier source. */")
lines.append("  tdSymbol: string | null")
lines.append("  unit?: string")
lines.append("}")
lines.append("")
lines.append(f"// {len(ordered)} assets")
lines.append("export const ASSET_UNIVERSE: UniverseAsset[] = [")
for a in ordered:
    parts = [
        f"ticker:{ts_str(a['ticker'])}",
        f"name:{ts_str(a['name'])}",
        f"exchange:{ts_str(a['exchange'])}",
        f"type:{ts_str(a['type'])}",
        f"sector:{ts_str(a['sector'])}",
        f"sectorColor:{ts_str(a['sectorColor'])}",
        f"currency:{ts_str(a['currency'])}",
        f"tdSymbol:{ts_str(a['tdSymbol']) if a['tdSymbol'] is not None else 'null'}",
    ]
    if a.get("unit"):
        parts.append(f"unit:{ts_str(a['unit'])}")
    lines.append("  { " + ", ".join(parts) + " },")
lines.append("]")
lines.append("")
lines.append("// Common-name aliases → ticker (lowercased keys).")
lines.append("export const ASSET_ALIASES: Record<string, string> = {")
for k in sorted(aliases):
    lines.append(f"  {ts_str(k)}: {ts_str(aliases[k])},")
lines.append("}")
lines.append("")
lines.append("const BY_TICKER = new Map(ASSET_UNIVERSE.map(a => [a.ticker.toUpperCase(), a]))")
lines.append("export function getAsset(ticker: string): UniverseAsset | undefined {")
lines.append("  return BY_TICKER.get((ticker || '').toUpperCase())")
lines.append("}")
lines.append("")

here = os.path.dirname(os.path.abspath(__file__))
candidates = [
    os.path.join(here, "..", "src", "lib", "market", "universe.ts"),            # script in repo scripts/
    os.path.join(here, "..", "Fiscus", "src", "lib", "market", "universe.ts"),  # script in outputs/
]
out_path = next((os.path.abspath(p) for p in candidates if os.path.isdir(os.path.dirname(p))),
                os.path.abspath(candidates[0]))
with open(out_path, "w") as f:
    f.write("\n".join(lines))

print(f"Wrote {out_path}")
print(f"Total assets: {len(ordered)}")
from collections import Counter
c = Counter(a["type"] for a in ordered)
print("By type:", dict(c))
print("Aliases:", len(aliases))
