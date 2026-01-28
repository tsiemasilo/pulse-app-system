import net from "node:net";
import tls from "node:tls";

import { storage } from "./storage";
import type { AssetDailyState, User } from "@shared/schema";

type AssetLostEmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromAddress: string;
  fromName?: string;
  itDepartmentEmail: string;
};

const getMailcowConfig = (): AssetLostEmailConfig | null => {
  const host = process.env.MAILCOW_SMTP_HOST;
  const port = Number(process.env.MAILCOW_SMTP_PORT ?? 465);
  const secure = (process.env.MAILCOW_SMTP_SECURE ?? "true").toLowerCase() === "true";
  const user = process.env.MAILCOW_SMTP_USER;
  const pass = process.env.MAILCOW_SMTP_PASS;
  const fromAddress = process.env.MAILCOW_FROM_ADDRESS;
  const fromName = process.env.MAILCOW_FROM_NAME;
  const itDepartmentEmail = process.env.IT_DEPARTMENT_EMAIL;

  if (!host || !user || !pass || !fromAddress || !itDepartmentEmail) {
    return null;
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromAddress,
    fromName,
    itDepartmentEmail,
  };
};

const formatPersonName = (user: User | null): string => {
  if (!user) return "Unknown user";
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  return user.username;
};

const createSocket = (config: AssetLostEmailConfig): Promise<net.Socket> =>
  new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      reject(error);
    };
    const socket = config.secure
      ? tls.connect({ host: config.host, port: config.port }, () => resolve(socket))
      : net.connect({ host: config.host, port: config.port }, () => resolve(socket));

    socket.once("error", onError);
  });

const readResponse = (socket: net.Socket): Promise<{ code: number; message: string }> =>
  new Promise((resolve, reject) => {
    let buffer = "";

    const onData = (data: Buffer) => {
      buffer += data.toString("utf8");
      const lines = buffer.split("\r\n").filter(Boolean);
      if (lines.length === 0) return;

      const lastLine = lines[lines.length - 1];
      if (lastLine.length < 4) return;
      if (lastLine[3] !== " ") return;

      const code = Number.parseInt(lastLine.slice(0, 3), 10);
      cleanup();
      resolve({ code, message: lines.join("\n") });
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });

const sendCommand = async (
  socket: net.Socket,
  command: string,
  expectedCodes: number[]
): Promise<void> => {
  socket.write(`${command}\r\n`);
  const response = await readResponse(socket);
  if (!expectedCodes.includes(response.code)) {
    throw new Error(`SMTP command failed (${command}): ${response.message}`);
  }
};

const sendEmailViaSmtp = async (
  config: AssetLostEmailConfig,
  subject: string,
  text: string
): Promise<void> => {
  const socket = await createSocket(config);
  try {
    const greeting = await readResponse(socket);
    if (![220].includes(greeting.code)) {
      throw new Error(`SMTP greeting failed: ${greeting.message}`);
    }

    await sendCommand(socket, `EHLO ${config.host}`, [250]);
    await sendCommand(socket, "AUTH LOGIN", [334]);
    await sendCommand(socket, Buffer.from(config.user).toString("base64"), [334]);
    await sendCommand(socket, Buffer.from(config.pass).toString("base64"), [235]);

    await sendCommand(socket, `MAIL FROM:<${config.fromAddress}>`, [250]);
    await sendCommand(socket, `RCPT TO:<${config.itDepartmentEmail}>`, [250, 251]);
    await sendCommand(socket, "DATA", [354]);

    const from = config.fromName
      ? `${config.fromName} <${config.fromAddress}>`
      : config.fromAddress;
    const headers = [
      `From: ${from}`,
      `To: ${config.itDepartmentEmail}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
    ].join("\r\n");
    socket.write(`${headers}\r\n\r\n${text}\r\n.\r\n`);

    const dataResponse = await readResponse(socket);
    if (![250].includes(dataResponse.code)) {
      throw new Error(`SMTP DATA failed: ${dataResponse.message}`);
    }

    await sendCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
};

export const sendAssetLostEmail = async (
  assetState: AssetDailyState,
  reportedByUser: User
): Promise<void> => {
  const config = getMailcowConfig();
  if (!config) {
    console.warn("Mailcow email configuration is missing; skipping asset lost email.");
    return;
  }

  const targetUser = await storage.getUser(assetState.userId);
  const targetName = formatPersonName(targetUser);
  const reporterName = formatPersonName(reportedByUser);

  const subject = `Asset Lost: ${targetName} - ${assetState.assetType}`;
  const reasonLine = assetState.reason ? `Reason: ${assetState.reason}` : "Reason: Not provided";
  const lossDate = assetState.dateLost
    ? new Date(assetState.dateLost).toISOString().split("T")[0]
    : assetState.date;

  const text = [
    "An asset has been marked as lost.",
    "",
    `Employee: ${targetName}`,
    `Asset Type: ${assetState.assetType}`,
    `Date Lost: ${lossDate}`,
    reasonLine,
    `Reported By: ${reporterName}`,
  ].join("\n");

  await sendEmailViaSmtp(config, subject, text);
};
