import { CertificateManagerClient } from '@google-cloud/certificate-manager';

const PROJECT = 'scrolly-page';
const LOCATION = 'global';
const CERTIFICATE_MAP = 'scrolly-page-cert-map';
const PARENT = `projects/${PROJECT}/locations/${LOCATION}`;

const certificatemanagerClient = new CertificateManagerClient();

function _getCertInfo(hostname: string): {
  certificateId: string;
  certificatePath: string;
  certificateMapEntryId: string;
  domains: string[];
} {
  // Strip "www." if present to get the base domain
  const baseDomain = hostname.replace(/^www\./, '');
  const baseId = baseDomain.replace(/\./g, '-');
  const certificateId = `${baseId}-cert`;
  const certificatePath = `${PARENT}/certificates/${certificateId}`;
  const certificateMapEntryId = `${baseId}-entry`;

  // Include both the base domain and www subdomain
  const domains = [baseDomain, `www.${baseDomain}`];

  return {
    certificateId,
    certificatePath,
    certificateMapEntryId,
    domains,
  };
}

export async function createCertificate(hostname: string): Promise<void> {
  // Strip "www." if present to normalize the hostname
  const normalizedHostname = hostname.replace(/^www\./, '');
  const { certificateId, certificatePath, domains } = _getCertInfo(normalizedHostname);

  // Create a certificate that covers both the domain and www subdomain
  const [operation] = await certificatemanagerClient.createCertificate({
    parent: PARENT,
    certificateId,
    certificate: {
      name: certificatePath,
      description: 'Created by cloud function. Covers both domain and www subdomain.',
      managed: {
        domains,
      },
    },
  });
  await operation.promise();

  // Create map entries for both the base domain and www subdomain
  for (const domain of domains) {
    const domainSpecificEntryId = `${domain.replace(/\./g, '-')}-entry`;

    await certificatemanagerClient.createCertificateMapEntry({
      parent: `${PARENT}/certificateMaps/${CERTIFICATE_MAP}`,
      certificateMapEntryId: domainSpecificEntryId,
      certificateMapEntry: {
        certificates: [certificatePath],
        hostname: domain,
      },
    });
  }
}

export async function deleteCertificate(hostname: string): Promise<void> {
  // Strip "www." if present to normalize the hostname
  const normalizedHostname = hostname.replace(/^www\./, '');
  const { certificatePath, domains } = _getCertInfo(normalizedHostname);
  const parent = `projects/${PROJECT}/locations/${LOCATION}`;

  // Delete map entries for both domains
  for (const domain of domains) {
    const domainSpecificEntryId = `${domain.replace(/\./g, '-')}-entry`;

    try {
      await certificatemanagerClient.deleteCertificateMapEntry({
        name: `${parent}/certificateMaps/${CERTIFICATE_MAP}/certificateMapEntries/${domainSpecificEntryId}`,
      });
    } catch (error) {
      console.warn(`Failed to delete certificate map entry for ${domain}:`, error);
    }
  }

  // Wait a bit to ensure map entries are fully deleted
  await new Promise((resolve) => {
    setTimeout(resolve, 2500);
  });

  // Delete the certificate itself
  try {
    await certificatemanagerClient.deleteCertificate({
      name: certificatePath,
    });
  } catch (error) {
    console.warn('Failed to delete certificate:', error);
  }
}
