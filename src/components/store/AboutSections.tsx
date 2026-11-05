import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  Headphones,
  Mail,
  MapPin,
  Phone,
  Snowflake,
} from "lucide-react";
import { ContentIcon } from "@/components/store/ContentIcon";
import { normalizeDigits, toPersianDigits } from "@/lib/format";
import { assetUrlSchema } from "@/validations/common";
import {
  sectionLinkSchema,
  type AboutSection,
} from "@/validations/about-sections";
import styles from "./AboutSections.module.css";

export type AboutContact = { phone: string; email: string; address: string };

function SectionButton({
  button,
  preview,
  variant = "primary",
}: {
  button: AboutSection["button"];
  preview: boolean;
  variant?: "primary" | "secondary" | "text";
}) {
  if (
    !button?.enabled ||
    !button.label ||
    !sectionLinkSchema.safeParse(button.href).success
  )
    return null;
  const className =
    variant === "text" ? styles.storyLink : `hero-cta hero-cta-${variant}`;
  const content = (
    <>
      {button.label}
      {variant === "text" ? (
        <ArrowDown size={18} aria-hidden="true" />
      ) : variant === "secondary" ? (
        <Headphones size={20} aria-hidden="true" />
      ) : (
        <ArrowLeft size={20} aria-hidden="true" />
      )}
    </>
  );
  return preview ? (
    <span className={className}>{content}</span>
  ) : (
    <Link className={className} href={button.href}>
      {content}
    </Link>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
    </>
  );
}

function ContactDetails({
  section,
  contact,
  preview,
}: {
  section: AboutSection;
  contact: AboutContact;
  preview: boolean;
}) {
  const settings = section.contact;
  const details = settings?.useStore ? contact : settings;
  return (
    <address className={styles.contactDetails}>
      {settings?.showPhone && details?.phone && (
        <div>
          <Phone size={20} aria-hidden="true" />
          {preview ? (
            <span dir="ltr">{toPersianDigits(details.phone)}</span>
          ) : (
            <a
              dir="ltr"
              href={`tel:${normalizeDigits(details.phone).replace(/[^+0-9]/g, "")}`}
            >
              {toPersianDigits(details.phone)}
            </a>
          )}
        </div>
      )}
      {settings?.showEmail && details?.email && (
        <div>
          <Mail size={20} aria-hidden="true" />
          {preview ? (
            <span dir="ltr">{details.email}</span>
          ) : (
            <a dir="ltr" href={`mailto:${details.email}`}>
              {details.email}
            </a>
          )}
        </div>
      )}
      {settings?.showAddress && details?.address && (
        <div>
          <MapPin size={20} aria-hidden="true" />
          <span>{details.address}</span>
        </div>
      )}
    </address>
  );
}

export function AboutSections({
  sections,
  contact,
  preview = false,
}: {
  sections: AboutSection[];
  contact: AboutContact;
  preview?: boolean;
}) {
  const visible = preview
    ? sections
    : sections.filter((section) => section.isActive !== false);
  return (
    <div className={`${styles.sections} ${preview ? styles.preview : ""}`}>
      {visible.map((section, index) => {
        const type = section.template ?? "story";
        const items = (section.items ?? []).filter((item) => item.isActive);
        const validImage =
          !!section.imageUrl &&
          assetUrlSchema.safeParse(section.imageUrl).success;
        const anchor =
          visible.findIndex((item) => (item.template ?? "story") === type) ===
          index
            ? `about-${type}`
            : `about-${type}-${index}`;
        const eyebrow = section.eyebrow && (
          <p className={styles.eyebrow}>
            {type === "introduction" && (
              <Snowflake size={20} aria-hidden="true" />
            )}
            {section.eyebrow}
          </p>
        );
        const title = (
          <h2>
            {section.title}
            {section.titleAccent && (
              <>
                <br />
                <span>{section.titleAccent}</span>
              </>
            )}
          </h2>
        );
        const buttons = (
          <div className={styles.actions}>
            <SectionButton
              button={section.button}
              preview={preview}
              variant={type === "steps" ? "secondary" : "primary"}
            />
            <SectionButton
              button={section.secondaryButton}
              preview={preview}
              variant={type === "introduction" ? "text" : "secondary"}
            />
          </div>
        );
        const inactive = preview && section.isActive === false && (
          <p className={styles.inactive}>
            این بخش در فروشگاه نمایش داده نمی‌شود.
          </p>
        );
        if (type === "introduction")
          return (
            <section
              key={section.id ?? index}
              id={anchor}
              className={styles.hero}
              data-template={type}
            >
              {inactive}
              <div
                className={`store-shell ${styles.heroGrid} ${section.imagePosition === "start" ? styles.imageFirst : ""} ${!validImage ? styles.withoutImage : ""}`}
              >
                <div className={styles.heroCopy}>
                  {eyebrow}
                  {title}
                  <p className={styles.description}>{section.description}</p>
                  {buttons}
                  {section.note && (
                    <p className={styles.heroNote}>{section.note}</p>
                  )}
                </div>
                {validImage && (
                  <div className={styles.heroVisual}>
                    <div className={styles.orbit} aria-hidden="true" />
                    <Image
                      src={section.imageUrl}
                      alt={section.imageAlt || section.title}
                      width={1080}
                      height={1440}
                      unoptimized
                      className={styles.heroProduct}
                    />
                    {(section.captionTitle || section.captionDescription) && (
                      <div className={styles.visualCaption}>
                        <Snowflake size={24} aria-hidden="true" />
                        <span>
                          {section.captionTitle}
                          {section.captionDescription && (
                            <small>{section.captionDescription}</small>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        if (type === "story")
          return (
            <section
              key={section.id ?? index}
              id={anchor}
              className={`store-shell ${styles.section} ${styles.story} ${section.imagePosition === "start" ? styles.imageFirst : ""} ${!validImage ? styles.withoutImage : ""}`}
              data-template={type}
            >
              <div className={styles.storyCopy}>
                {inactive}
                {eyebrow}
                {title}
                <Paragraphs text={section.description} />
                {buttons}
              </div>
              {validImage && (
                <figure className={styles.storyVisual}>
                  <Image
                    src={section.imageUrl}
                    alt={section.imageAlt || section.title}
                    fill
                    unoptimized
                    className={styles.storyImage}
                  />
                </figure>
              )}
            </section>
          );
        return (
          <section
            key={section.id ?? index}
            id={anchor}
            className={`store-shell ${styles.section} ${type === "contact" ? styles.finalSection : ""}`}
            data-template={type}
          >
            {inactive}
            {type === "values" && (
              <>
                <header className={styles.sectionHeader}>
                  {eyebrow}
                  {title}
                  <p className={styles.description}>{section.description}</p>
                </header>
                <div className={styles.values}>
                  {items.map((item) => (
                    <article key={item.id} className={styles.valueCard}>
                      <span className={styles.iconBox}>
                        <ContentIcon name={item.icon} />
                      </span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
            {type === "steps" && (
              <div className={styles.commitment}>
                <div>
                  {eyebrow}
                  {title}
                  <p className={styles.description}>{section.description}</p>
                  {buttons}
                </div>
                <div className={styles.specPanel}>
                  {section.panelTitle && (
                    <div className={styles.specHeading}>
                      <Snowflake size={24} aria-hidden="true" />
                      <span>{section.panelTitle}</span>
                    </div>
                  )}
                  {items.map((item, itemIndex) => (
                    <div className={styles.specRow} key={item.id}>
                      <ContentIcon name={item.icon} size={24} />
                      <div>
                        <h3>
                          <span className={styles.stepNumber}>
                            {toPersianDigits(itemIndex + 1)}.{" "}
                          </span>
                          {item.title}
                        </h3>
                        <p>{item.description}</p>
                        <SectionButton
                          button={item.button}
                          preview={preview}
                          variant="text"
                        />
                      </div>
                    </div>
                  ))}
                  {section.panelNote && (
                    <p className={styles.specNote}>{section.panelNote}</p>
                  )}
                </div>
              </div>
            )}
            {type === "faq" && (
              <div className={styles.faq}>
                <header className={styles.sectionHeader}>
                  {eyebrow}
                  {title}
                  <p className={styles.description}>{section.description}</p>
                </header>
                <div className={styles.questions}>
                  {items.map((item, itemIndex) => (
                    <details
                      key={`${item.id}-${section.openFirst}`}
                      open={
                        section.openFirst && itemIndex === 0 ? true : undefined
                      }
                    >
                      <summary>{item.title}</summary>
                      <p>{item.description}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
            {type === "contact" && (
              <div className={styles.cta}>
                <Snowflake
                  className={styles.ctaSnowflake}
                  size={180}
                  strokeWidth={0.7}
                  aria-hidden="true"
                />
                {eyebrow}
                {title}
                <p className={styles.description}>{section.description}</p>
                {buttons}
                <ContactDetails
                  section={section}
                  contact={contact}
                  preview={preview}
                />
                {section.note && (
                  <p className={styles.specNote}>{section.note}</p>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
