import { createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import { studionet } from "genlayer-js/chains";

export interface Audit {
  owner: string;
  project_name: string;
  manifest_url: string;
  license_index_url: string;
  exceptions_url: string;
  forbidden_licenses: string;
  violation_count: number | string;
  status: string;
  created_at: number | string;
}

export interface Claim {
  audit_id: number | string;
  claimant: string;
  title: string;
  statement: string;
  claimed_severity: string;
  status: string;
  ruled_severity: string;
  triage_summary: string;
  evidence: string;
  submitted_at: number | string;
}

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x06a852688E326D0596E786519E15168AE16C98B4") as `0x${string}`;
const STUDIO_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

/** Bridge between the Next.js frontend and the LicenseCourt intelligent contract. */
export class LicenseCourt {
  private client: ReturnType<typeof createClient>;

  constructor(address?: string | null) {
    const config: Record<string, unknown> = {
      chain: studionet,
      endpoint: STUDIO_URL,
    };
    if (address) config.account = address as `0x${string}`;
    this.client = createClient(config as never);
  }

  // ---- reads (free, no signature) ----

  async getAuditCount(): Promise<number> {
    const n: any = await this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_audit_count",
      args: [],
    });
    return Number(n);
  }

  async getClaimCount(): Promise<number> {
    const n: any = await this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_claim_count",
      args: [],
    });
    return Number(n);
  }

  async getAudit(auditId: number): Promise<Audit> {
    return (await this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_audit",
      args: [auditId],
    })) as unknown as Audit;
  }

  async getClaim(claimId: number): Promise<Claim> {
    return (await this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_claim",
      args: [claimId],
    })) as unknown as Claim;
  }

  async getViolationCount(auditId: number): Promise<number> {
    const n: any = await this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_violation_count",
      args: [auditId],
    });
    return Number(n);
  }

  async getAudits(): Promise<Audit[]> {
    const count = await this.getAuditCount();
    const audits: Audit[] = [];
    for (let i = 0; i < count; i++) audits.push(await this.getAudit(i));
    return audits;
  }

  async getClaims(): Promise<Claim[]> {
    const count = await this.getClaimCount();
    const claims: Claim[] = [];
    for (let i = 0; i < count; i++) claims.push(await this.getClaim(i));
    return claims;
  }

  // ---- writes (MetaMask signature, consensus takes minutes) ----

  private async waitAccepted(hash: `0x${string}`) {
    return this.client.waitForTransactionReceipt({
      hash: hash as never,
      status: TransactionStatus.ACCEPTED,
      retries: 60,
      interval: 5000,
    });
  }

  async createAudit(input: {
    projectName: string;
    manifestUrl: string;
    licenseIndexUrl: string;
    exceptionsUrl: string;
    forbiddenLicenses: string;
  }) {
    const hash = await this.client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "create_audit",
      value: 0n,
      args: [
        input.projectName,
        input.manifestUrl,
        input.licenseIndexUrl,
        input.exceptionsUrl,
        input.forbiddenLicenses,
      ],
    });
    return this.waitAccepted(hash as `0x${string}`);
  }

  async submitClaim(input: {
    auditId: number;
    title: string;
    statement: string;
    claimedSeverity: string;
  }) {
    const hash = await this.client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "submit_claim",
      value: 0n,
      args: [input.auditId, input.title, input.statement, input.claimedSeverity],
    });
    return this.waitAccepted(hash as `0x${string}`);
  }

  async assessClaim(claimId: number) {
    const hash = await this.client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "assess_claim",
      value: 0n,
      args: [claimId],
    });
    return this.waitAccepted(hash as `0x${string}`);
  }
}
