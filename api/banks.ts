export const config = {
  runtime: "edge",
};

// Complete authentic 173 Nigerian banks directory from Textile Credit / Busha NIBSS rails
const OFFICIAL_NIGERIAN_BANKS = [
  {
    "code": "100004",
    "name": "Opay"
  },
  {
    "code": "100033",
    "name": "Palmpay"
  },
  {
    "code": "090267",
    "name": "Kuda Microfinance Bank"
  },
  {
    "code": "090405",
    "name": "Moniepoint Microfinance Bank"
  },
  {
    "code": "000013",
    "name": "Guaranty Trust Bank"
  },
  {
    "code": "000014",
    "name": "Access Bank"
  },
  {
    "code": "000015",
    "name": "Zenith Bank"
  },
  {
    "code": "000004",
    "name": "United Bank For Africa"
  },
  {
    "code": "000016",
    "name": "Firstbank Of Nigeria"
  },
  {
    "code": "120001",
    "name": "9 Payment Solutions Bank"
  },
  {
    "code": "070010",
    "name": "Abbey Mortgage Bank"
  },
  {
    "code": "100013",
    "name": "Accessmobile"
  },
  {
    "code": "090134",
    "name": "Accion Microfinance Bank"
  },
  {
    "code": "090160",
    "name": "Addosser Microfinance Bank"
  },
  {
    "code": "100028",
    "name": "Ag Mortgage Bank Plc"
  },
  {
    "code": "090133",
    "name": "Al-Barkah Microfinance Bank"
  },
  {
    "code": "090131",
    "name": "Allworkers Microfinance Bank"
  },
  {
    "code": "090169",
    "name": "Alpha Kapital Microfinance Bank"
  },
  {
    "code": "090180",
    "name": "Amju Microfinance Bank"
  },
  {
    "code": "090116",
    "name": "Amml Microfinance Bank"
  },
  {
    "code": "090143",
    "name": "Apeks Microfinance Bank"
  },
  {
    "code": "090001",
    "name": "Asosavings Bank"
  },
  {
    "code": "090172",
    "name": "Astrapolis Microfinance Bank"
  },
  {
    "code": "090127",
    "name": "Bc Kash Microfinance Bank"
  },
  {
    "code": "090591",
    "name": "Beamer (Gabsyn) Microfinance Bank"
  },
  {
    "code": "090117",
    "name": "Boctrust Microfinance Bank"
  },
  {
    "code": "090819",
    "name": "Boost Microfinance Bank"
  },
  {
    "code": "090176",
    "name": "Bosak Microfinance Bank"
  },
  {
    "code": "090148",
    "name": "Bowen Microfinance Bank"
  },
  {
    "code": "070015",
    "name": "Brent Generation Mortgage Bank"
  },
  {
    "code": "100026",
    "name": "Carbon Microfinance Bank (One Finance)"
  },
  {
    "code": "100005",
    "name": "Cellulant"
  },
  {
    "code": "090154",
    "name": "Cemcs Microfinance Bank"
  },
  {
    "code": "090141",
    "name": "Chikum Microfinance Bank"
  },
  {
    "code": "090144",
    "name": "Cit Microfinance Bank"
  },
  {
    "code": "000009",
    "name": "Citibank Nigeria"
  },
  {
    "code": "090130",
    "name": "Consumer Microfinance Bank"
  },
  {
    "code": "100032",
    "name": "Contec Global"
  },
  {
    "code": "070006",
    "name": "Convenant Microfinance Bank"
  },
  {
    "code": "060001",
    "name": "Coronation Bank"
  },
  {
    "code": "090159",
    "name": "Credit Afrique Microfinance Bank"
  },
  {
    "code": "090167",
    "name": "Daylight Microfinance Bank"
  },
  {
    "code": "090156",
    "name": "E-Barcs Microfinance Bank"
  },
  {
    "code": "100021",
    "name": "Eartholeum"
  },
  {
    "code": "000010",
    "name": "Ecobank Nigeria"
  },
  {
    "code": "100008",
    "name": "Ecobank Xpress Account"
  },
  {
    "code": "090097",
    "name": "Ekondo Microfinance Bank"
  },
  {
    "code": "090114",
    "name": "Empire Microfinance Bank"
  },
  {
    "code": "090166",
    "name": "Eso-E Microfinance Bank"
  },
  {
    "code": "100006",
    "name": "Etranzact"
  },
  {
    "code": "090328",
    "name": "Eyowo Microfinance Bank"
  },
  {
    "code": "090551",
    "name": "Fairmoney Mfb"
  },
  {
    "code": "090179",
    "name": "Fast Microfinance Bank"
  },
  {
    "code": "100014",
    "name": "Fbnmobile"
  },
  {
    "code": "060002",
    "name": "Fbnquest Bank"
  },
  {
    "code": "100031",
    "name": "Fcmb Mobile"
  },
  {
    "code": "100001",
    "name": "Fets Microfinance Bank"
  },
  {
    "code": "090153",
    "name": "Ffs Microfinance Bank"
  },
  {
    "code": "000007",
    "name": "Fidelity Bank"
  },
  {
    "code": "100019",
    "name": "Fidelity Mobile"
  },
  {
    "code": "090126",
    "name": "Fidfund Microfinance Bank"
  },
  {
    "code": "090111",
    "name": "Finatrust Microfinance Bank"
  },
  {
    "code": "000003",
    "name": "First City Monument Bank"
  },
  {
    "code": "070014",
    "name": "First Generation Mortgage Bank"
  },
  {
    "code": "090163",
    "name": "First Multiple Microfinance Bank"
  },
  {
    "code": "090164",
    "name": "First Royal Microfinance Bank"
  },
  {
    "code": "110002",
    "name": "Flutterwave Technology Solutions Limited"
  },
  {
    "code": "090107",
    "name": "Fnb Mortgages Bank"
  },
  {
    "code": "070002",
    "name": "Fortis Microfinance Bank"
  },
  {
    "code": "100016",
    "name": "Fortismobile"
  },
  {
    "code": "400001",
    "name": "Fsdh"
  },
  {
    "code": "090145",
    "name": "Fullrange Microfinance Bank"
  },
  {
    "code": "090158",
    "name": "Futo Microfinance Bank"
  },
  {
    "code": "090168",
    "name": "Gashua Microfinance Bank"
  },
  {
    "code": "070009",
    "name": "Gateway Mortgage Bank"
  },
  {
    "code": "000027",
    "name": "Globus Bank"
  },
  {
    "code": "090122",
    "name": "Gowans Microfinance Bank"
  },
  {
    "code": "090178",
    "name": "Greenbank Microfinance Bank"
  },
  {
    "code": "100009",
    "name": "Gtmobile"
  },
  {
    "code": "090147",
    "name": "Hackman Microfinance Bank"
  },
  {
    "code": "070017",
    "name": "Haggai Mortgage Bank"
  },
  {
    "code": "090121",
    "name": "Hasal Microfinance Bank"
  },
  {
    "code": "100017",
    "name": "Hedonmark"
  },
  {
    "code": "000020",
    "name": "Heritage Bank"
  },
  {
    "code": "090118",
    "name": "Ibile Microfinance Bank"
  },
  {
    "code": "100024",
    "name": "Imperial Homes Mortgage Bank"
  },
  {
    "code": "090157",
    "name": "Infinity Microfinance Bank"
  },
  {
    "code": "070016",
    "name": "Infinity Trust Generation Mortgage Bank"
  },
  {
    "code": "100029",
    "name": "Innovectives Kesh"
  },
  {
    "code": "100027",
    "name": "Intellifin"
  },
  {
    "code": "090149",
    "name": "Irl Microfinance Bank"
  },
  {
    "code": "000006",
    "name": "Jaiz Bank"
  },
  {
    "code": "090003",
    "name": "Jubileelife Bank"
  },
  {
    "code": "100015",
    "name": "Kegow"
  },
  {
    "code": "000002",
    "name": "Keystone Bank"
  },
  {
    "code": "090155",
    "name": "Lafayette Microfinance Bank"
  },
  {
    "code": "090177",
    "name": "Lapo Microfinance Bank"
  },
  {
    "code": "070012",
    "name": "Lbic Mortgage Bank"
  },
  {
    "code": "090171",
    "name": "Mainstreet Microfinance Bank"
  },
  {
    "code": "090174",
    "name": "Malachy Microfinance Bank"
  },
  {
    "code": "090136",
    "name": "Microcred Microfinance Bank"
  },
  {
    "code": "100011",
    "name": "Mkudi"
  },
  {
    "code": "120003",
    "name": "Momo Psb"
  },
  {
    "code": "100020",
    "name": "Moneybox"
  },
  {
    "code": "090129",
    "name": "Moneytrust Microfinance Bank"
  },
  {
    "code": "090151",
    "name": "Mutual Trust Microfinance Bank"
  },
  {
    "code": "090152",
    "name": "Nargata Microfinance Bank"
  },
  {
    "code": "090128",
    "name": "Ndiorah Microfinance Bank"
  },
  {
    "code": "090108",
    "name": "New Prudential Bank"
  },
  {
    "code": "999999",
    "name": "Nip Virtual Bank"
  },
  {
    "code": "090645",
    "name": "Nombank Mfb"
  },
  {
    "code": "060003",
    "name": "Nova Merchant Bank"
  },
  {
    "code": "070001",
    "name": "Npf Microfinance Bank"
  },
  {
    "code": "090119",
    "name": "Ohafia Microfinance Bank"
  },
  {
    "code": "090161",
    "name": "Okpoga Microfinance Bank"
  },
  {
    "code": "070007",
    "name": "Omoluabi Mortgage Bank"
  },
  {
    "code": "000036",
    "name": "Optimus Bank"
  },
  {
    "code": "100002",
    "name": "Paga"
  },
  {
    "code": "070008",
    "name": "Page Microfinance Bank"
  },
  {
    "code": "100003",
    "name": "Parkway-Readycash Microfinance Bank"
  },
  {
    "code": "110001",
    "name": "Payattitude Online"
  },
  {
    "code": "090137",
    "name": "Pecan Trust Microfinance Bank"
  },
  {
    "code": "090135",
    "name": "Personal Trust Microfinance Bank"
  },
  {
    "code": "090165",
    "name": "Petra Microfinance Bank"
  },
  {
    "code": "070013",
    "name": "Platinum Mortgage Bank"
  },
  {
    "code": "100042",
    "name": "Pocketapp"
  },
  {
    "code": "000008",
    "name": "Polaris Bank"
  },
  {
    "code": "090004",
    "name": "Prallex Bank"
  },
  {
    "code": "000031",
    "name": "Premium Trust Bank"
  },
  {
    "code": "000023",
    "name": "Providus Bank"
  },
  {
    "code": "090170",
    "name": "Rahama Microfinance Bank"
  },
  {
    "code": "000024",
    "name": "Rand Merchant Bank"
  },
  {
    "code": "070011",
    "name": "Refuge Mortgage Bank"
  },
  {
    "code": "090125",
    "name": "Regent Microfinance Bank"
  },
  {
    "code": "090173",
    "name": "Reliance Microfinance Bank"
  },
  {
    "code": "090198",
    "name": "Renmoney Mfb"
  },
  {
    "code": "090132",
    "name": "Richway Microfinance Bank"
  },
  {
    "code": "50515",
    "name": "Rolez Microfinance Bank"
  },
  {
    "code": "090138",
    "name": "Royal Exchange Microfinance Bank"
  },
  {
    "code": "090175",
    "name": "Rubies Microfinance Bank"
  },
  {
    "code": "090140",
    "name": "Sagamu Microfinance Bank"
  },
  {
    "code": "100007",
    "name": "Savetrust Bank"
  },
  {
    "code": "090112",
    "name": "Seed Capital Microfinance Bank"
  },
  {
    "code": "120004",
    "name": "Smartcash Psb"
  },
  {
    "code": "090325",
    "name": "Sparkle Microfinance Bank"
  },
  {
    "code": "000012",
    "name": "Stanbic Ibtc Bank"
  },
  {
    "code": "090006",
    "name": "Stanbicmobilemoney"
  },
  {
    "code": "000021",
    "name": "Standard Chartered Bank"
  },
  {
    "code": "090162",
    "name": "Stanford Microfinance Bank"
  },
  {
    "code": "000001",
    "name": "Sterling Bank"
  },
  {
    "code": "100022",
    "name": "Sterling Mobile (Gomoney)"
  },
  {
    "code": "000022",
    "name": "Suntrust Bank"
  },
  {
    "code": "100023",
    "name": "Tagpay"
  },
  {
    "code": "000026",
    "name": "Taj Bank"
  },
  {
    "code": "090115",
    "name": "Tcf Microfinance Bank"
  },
  {
    "code": "100010",
    "name": "Teasymobile"
  },
  {
    "code": "000025",
    "name": "Titan Trust Bank"
  },
  {
    "code": "100039",
    "name": "Titan-Paystack"
  },
  {
    "code": "090146",
    "name": "Trident Microfinance Bank"
  },
  {
    "code": "090005",
    "name": "Trustbond Bank"
  },
  {
    "code": "000018",
    "name": "Union Bank"
  },
  {
    "code": "000011",
    "name": "Unity Bank"
  },
  {
    "code": "090123",
    "name": "Verite Microfinance Bank"
  },
  {
    "code": "090110",
    "name": "Vfd Microfinance Bank"
  },
  {
    "code": "090150",
    "name": "Virtue Microfinance Bank"
  },
  {
    "code": "090139",
    "name": "Visa Microfinance Bank"
  },
  {
    "code": "100012",
    "name": "Vtnetworks"
  },
  {
    "code": "000017",
    "name": "Wema Bank"
  },
  {
    "code": "090120",
    "name": "Wetland Microfinance Bank"
  },
  {
    "code": "090124",
    "name": "Xslnce Microfinance Bank"
  },
  {
    "code": "090142",
    "name": "Yes Microfinance Bank"
  },
  {
    "code": "100018",
    "name": "Zenithmobile"
  },
  {
    "code": "100025",
    "name": "Zinternet - Kongapay"
  }
];

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // 1. Attempt live query to Textile Credit / Busha NIBSS API
  try {
    const textileBase = (process.env.TEXTILE_API_URL || process.env.VITE_TEXTILE_API_URL || 'https://api.textilecredit.com').replace(/\/+$/, '');
    const textileRes = await fetch(`${textileBase}/v2/ramp/banks?provider=busha`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(4000),
    });

    if (textileRes.ok) {
      const data = await textileRes.json();
      const banksList = Array.isArray(data) ? data : (data?.banks || data?.data || []);
      if (Array.isArray(banksList) && banksList.length > 0) {
        // Priority sort popular banks
        const priority = ["OPay", "PalmPay", "Kuda", "Moniepoint", "Guaranty Trust Bank", "Access Bank", "Zenith Bank", "United Bank For Africa", "Firstbank Of Nigeria"];
        const pList: any[] = [];
        const rList: any[] = [];
        banksList.forEach((b: any) => {
          const isP = priority.some(p => String(b.name || "").toLowerCase().includes(p.toLowerCase()));
          if (isP) pList.push(b);
          else rList.push(b);
        });
        pList.sort((a, b) => {
          const aIdx = priority.findIndex(p => a.name.toLowerCase().includes(p.toLowerCase()));
          const bIdx = priority.findIndex(p => b.name.toLowerCase().includes(p.toLowerCase()));
          return aIdx - bIdx;
        });
        rList.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        const sorted = [...pList, ...rList];

        return new Response(JSON.stringify(sorted), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }
    }
  } catch (err) {
    console.warn("[Vercel Edge] Textile banks fetch error, using official fallback:", err);
  }

  // 2. High-reliability fallback returning all 173 official Nigerian banks
  return new Response(JSON.stringify(OFFICIAL_NIGERIAN_BANKS), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
