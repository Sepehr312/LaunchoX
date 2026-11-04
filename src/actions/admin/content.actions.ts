"use server";
import { requireAdmin } from "@/lib/auth";
import { mutateAboutSection, saveContent } from "@/services/content.service";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { AppError } from "@/lib/errors";
export async function saveContentAction(input: unknown) {
  await requireAdmin();
  try {
    await saveContent(input);
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? error.issues[0].message
          : error instanceof AppError
            ? error.message
            : "ذخیرهٔ محتوا انجام نشد",
    };
  }
}

export async function mutateAboutSectionAction(input: unknown) {
  await requireAdmin();
  try {
    const data = await mutateAboutSection(input);
    revalidatePath("/", "layout");
    return { ok: true as const, data };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? error.issues[0].message
          : error instanceof AppError
            ? error.message
            : "ذخیرهٔ بخش انجام نشد",
    };
  }
}
