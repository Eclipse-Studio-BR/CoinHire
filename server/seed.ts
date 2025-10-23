import { db } from "./db";
import { users, companies, jobs, plans } from "@shared/schema";
import { randomUUID, randomBytes, scryptSync } from "crypto";

function seedPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function seed() {
  console.log("🌱 Seeding database...");

  // Create sample users
  const sampleUsers = [
    {
      id: randomUUID(),
      email: "admin@web3jobs.com",
      username: "admin",
      passwordHash: seedPassword("AdminPass123"),
      firstName: "Admin",
      lastName: "User",
      role: "admin" as const,
      profileImageUrl: null,
    },
    {
      id: randomUUID(),
      email: "employer@defi.com",
      username: "employer",
      passwordHash: seedPassword("Employer123"),
      firstName: "John",
      lastName: "Employer",
      role: "employer" as const,
      profileImageUrl: null,
    },
    {
      id: randomUUID(),
      email: "talent@crypto.com",
      username: "talent",
      passwordHash: seedPassword("Talent123"),
      firstName: "Jane",
      lastName: "Developer",
      role: "talent" as const,
      profileImageUrl: null,
    },
  ];

  await db.insert(users).values(sampleUsers);
  console.log("✅ Created sample users");

  // Create sample companies
  const sampleCompanies = [
    {
      id: randomUUID(),
      name: "DeFi Protocol",
      slug: "defi-protocol",
      description: "Leading decentralized finance protocol building the future of money. We're creating innovative DeFi solutions that empower users worldwide.",
      logo: null,
      website: "https://defiprotocol.example",
      location: "Remote",
      size: "50-100 employees",
      isApproved: true,
      isHiring: true,
    },
    {
      id: randomUUID(),
      name: "NFT Marketplace",
      slug: "nft-marketplace",
      description: "The premier NFT marketplace connecting creators and collectors. Built on Ethereum with cutting-edge technology.",
      logo: null,
      website: "https://nftmarketplace.example",
      location: "San Francisco, CA",
      size: "100-250 employees",
      isApproved: true,
      isHiring: true,
    },
    {
      id: randomUUID(),
      name: "Blockchain Infrastructure",
      slug: "blockchain-infrastructure",
      description: "Enterprise blockchain infrastructure provider powering Web3 applications at scale.",
      logo: null,
      website: "https://blockchaininfra.example",
      location: "New York, NY",
      size: "250-500 employees",
      isApproved: true,
      isHiring: true,
    },
    {
      id: randomUUID(),
      name: "Web3 Gaming Studio",
      slug: "web3-gaming",
      description: "Revolutionary Web3 gaming studio creating immersive blockchain-based games.",
      logo: null,
      website: "https://web3gaming.example",
      location: "Remote",
      size: "10-50 employees",
      isApproved: true,
      isHiring: true,
    },
  ];

  await db.insert(companies).values(sampleCompanies);
  console.log("✅ Created sample companies");

  // Create sample jobs
  const jobsData = [
    // Premium tier jobs
    {
      id: randomUUID(),
      companyId: sampleCompanies[0].id,
      title: "Senior Smart Contract Engineer",
      description: "We're looking for an experienced smart contract engineer to lead the development of our next-generation DeFi protocols. You'll work with cutting-edge blockchain technology and help shape the future of decentralized finance.\n\nYou will be responsible for designing, implementing, and auditing smart contracts on Ethereum and other EVM-compatible chains.",
      requirements: "• 5+ years of software engineering experience\n• 3+ years of Solidity development\n• Deep understanding of DeFi protocols and security\n• Experience with formal verification and auditing\n• Strong knowledge of EVM and gas optimization",
      responsibilities: "• Design and implement secure smart contracts\n• Conduct code reviews and security audits\n• Optimize gas costs and contract efficiency\n• Collaborate with security researchers\n• Mentor junior developers",
      category: "Engineering",
      location: "Remote",
      isRemote: true,
      salaryMin: 150000,
      salaryMax: 250000,
      salaryCurrency: "USD",
      jobType: "full_time" as const,
      experienceLevel: "senior" as const,
      tier: "premium" as const,
      tags: ["Solidity", "Smart Contracts", "DeFi", "Ethereum", "Security"],
      status: "active" as const,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      viewCount: 1247,
      applyCount: 43,
      visibilityDays: 30,
    },
    {
      id: randomUUID(),
      companyId: sampleCompanies[1].id,
      title: "Principal Frontend Engineer (React/Web3)",
      description: "Join our team building the most intuitive NFT marketplace in Web3. We're seeking a principal frontend engineer to architect and build beautiful, performant user experiences.",
      requirements: "• 7+ years of frontend development\n• Expert-level React and TypeScript\n• Experience with Web3 libraries (ethers.js, wagmi)\n• Strong UI/UX design sensibility\n• Performance optimization expertise",
      responsibilities: "• Lead frontend architecture decisions\n• Build reusable component libraries\n• Integrate Web3 wallets and blockchain interactions\n• Optimize for performance and accessibility\n• Mentor engineering team",
      category: "Engineering",
      location: "San Francisco, CA",
      isRemote: false,
      salaryMin: 180000,
      salaryMax: 280000,
      salaryCurrency: "USD",
      jobType: "full_time" as const,
      experienceLevel: "senior" as const,
      tier: "premium" as const,
      tags: ["React", "TypeScript", "Web3", "ethers.js", "Frontend"],
      status: "active" as const,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      viewCount: 892,
      applyCount: 31,
      visibilityDays: 30,
    },
    // Featured tier jobs
    {
      id: randomUUID(),
      companyId: sampleCompanies[2].id,
      title: "DevOps Engineer - Blockchain Infrastructure",
      description: "Help us build and maintain the infrastructure that powers thousands of Web3 applications. We're looking for a DevOps engineer with blockchain expertise.",
      requirements: "• 4+ years DevOps experience\n• Experience with Kubernetes and Docker\n• Understanding of blockchain nodes and validators\n• AWS/GCP cloud expertise\n• Infrastructure as Code (Terraform)",
      responsibilities: "• Manage blockchain node infrastructure\n• Implement monitoring and alerting systems\n• Optimize infrastructure costs\n• Ensure high availability and security\n• Automate deployment pipelines",
      category: "Engineering",
      location: "New York, NY",
      isRemote: true,
      salaryMin: 120000,
      salaryMax: 180000,
      salaryCurrency: "USD",
      jobType: "full_time" as const,
      experienceLevel: "mid" as const,
      tier: "featured" as const,
      tags: ["DevOps", "Kubernetes", "AWS", "Blockchain", "Infrastructure"],
      status: "active" as const,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      viewCount: 654,
      applyCount: 22,
      visibilityDays: 14,
    },
    {
      id: randomUUID(),
      companyId: sampleCompanies[3].id,
      title: "Game Designer - Web3 Gaming",
      description: "Design the next generation of blockchain-based games. We're creating immersive experiences that blend traditional gaming with Web3 innovations.",
      requirements: "• 3+ years game design experience\n• Understanding of Web3 gaming mechanics\n• Experience with Unity or Unreal Engine\n• Portfolio of shipped games\n• Strong understanding of player psychology",
      responsibilities: "• Design game mechanics and systems\n• Create tokenomics and in-game economies\n• Balance gameplay and progression\n• Collaborate with development team\n• Prototype new game concepts",
      category: "Design",
      location: "Remote",
      isRemote: true,
      salaryMin: 90000,
      salaryMax: 140000,
      salaryCurrency: "USD",
      jobType: "full_time" as const,
      experienceLevel: "mid" as const,
      tier: "featured" as const,
      tags: ["Game Design", "Unity", "Web3", "Tokenomics", "Gaming"],
      status: "active" as const,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      viewCount: 421,
      applyCount: 18,
      visibilityDays: 14,
    },
    // Normal tier jobs
    {
      id: randomUUID(),
      companyId: sampleCompanies[0].id,
      title: "Junior Blockchain Developer",
      description: "Start your career in DeFi development! We're looking for talented junior developers eager to learn about blockchain technology and smart contracts.",
      requirements: "• 1-2 years programming experience\n• Basic understanding of JavaScript/TypeScript\n• Interest in blockchain and DeFi\n• Computer Science degree or equivalent\n• Strong problem-solving skills",
      responsibilities: "• Assist in smart contract development\n• Write tests and documentation\n• Debug and fix issues\n• Learn from senior engineers\n• Contribute to code reviews",
      category: "Engineering",
      location: "Remote",
      isRemote: true,
      salaryMin: 70000,
      salaryMax: 100000,
      salaryCurrency: "USD",
      jobType: "full_time" as const,
      experienceLevel: "entry" as const,
      tier: "normal" as const,
      tags: ["JavaScript", "TypeScript", "Blockchain", "DeFi", "Entry Level"],
      status: "active" as const,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      viewCount: 312,
      applyCount: 45,
      visibilityDays: 7,
    },
    {
      id: randomUUID(),
      companyId: sampleCompanies[1].id,
      title: "Content Marketing Manager",
      description: "Drive our content strategy and help educate the world about NFTs. Create compelling content that resonates with creators and collectors.",
      requirements: "• 3+ years content marketing experience\n• Understanding of Web3 and NFTs\n• Excellent writing and communication skills\n• SEO and social media expertise\n• Experience with community building",
      responsibilities: "• Develop content strategy\n• Write blog posts and guides\n• Manage social media presence\n• Collaborate with design team\n• Track content performance metrics",
      category: "Marketing",
      location: "Remote",
      isRemote: true,
      salaryMin: 80000,
      salaryMax: 120000,
      salaryCurrency: "USD",
      jobType: "full_time" as const,
      experienceLevel: "mid" as const,
      tier: "normal" as const,
      tags: ["Content Marketing", "SEO", "Social Media", "NFTs", "Web3"],
      status: "active" as const,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      viewCount: 198,
      applyCount: 12,
      visibilityDays: 7,
    },
    {
      id: randomUUID(),
      companyId: sampleCompanies[2].id,
      title: "Product Manager - Developer Tools",
      description: "Shape the future of blockchain developer tooling. Work with engineers to build products that developers love.",
      requirements: "• 4+ years product management experience\n• Technical background or CS degree\n• Experience with developer tools\n• Understanding of blockchain ecosystems\n• Strong analytical skills",
      responsibilities: "• Define product roadmap\n• Gather customer feedback\n• Write product specifications\n• Coordinate with engineering teams\n• Analyze product metrics",
      category: "Product",
      location: "New York, NY",
      isRemote: true,
      salaryMin: 130000,
      salaryMax: 180000,
      salaryCurrency: "USD",
      jobType: "full_time" as const,
      experienceLevel: "mid" as const,
      tier: "normal" as const,
      tags: ["Product Management", "Developer Tools", "Blockchain", "SaaS"],
      status: "active" as const,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      viewCount: 267,
      applyCount: 15,
      visibilityDays: 7,
    },
  ];

  await db.insert(jobs).values(jobsData);
  console.log("✅ Created sample jobs");

  // Create pricing plans
  const pricingPlans = [
    // Normal tier
    {
      id: randomUUID(),
      name: "Normal - 7 Days",
      tier: "normal" as const,
      price: 9900, // $99
      visibilityDays: 7,
      credits: 1,
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Normal - 14 Days",
      tier: "normal" as const,
      price: 17900, // $179
      visibilityDays: 14,
      credits: 2,
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Normal - 30 Days",
      tier: "normal" as const,
      price: 29900, // $299
      visibilityDays: 30,
      credits: 3,
      isActive: true,
    },
    // Featured tier
    {
      id: randomUUID(),
      name: "Featured - 7 Days",
      tier: "featured" as const,
      price: 19900, // $199
      visibilityDays: 7,
      credits: 2,
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Featured - 14 Days",
      tier: "featured" as const,
      price: 34900, // $349
      visibilityDays: 14,
      credits: 4,
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Featured - 30 Days",
      tier: "featured" as const,
      price: 59900, // $599
      visibilityDays: 30,
      credits: 6,
      isActive: true,
    },
    // Premium tier
    {
      id: randomUUID(),
      name: "Premium - 7 Days",
      tier: "premium" as const,
      price: 39900, // $399
      visibilityDays: 7,
      credits: 4,
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Premium - 14 Days",
      tier: "premium" as const,
      price: 69900, // $699
      visibilityDays: 14,
      credits: 7,
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Premium - 30 Days",
      tier: "premium" as const,
      price: 99900, // $999
      visibilityDays: 30,
      credits: 10,
      isActive: true,
    },
  ];

  await db.insert(plans).values(pricingPlans);
  console.log("✅ Created pricing plans");

  console.log("🎉 Seeding complete!");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
