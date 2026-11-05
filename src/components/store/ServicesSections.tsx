import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  ClipboardList,
  Headphones,
  Mail,
  Phone,
  ShieldCheck,
  Snowflake,
} from "lucide-react";
import { ContentIcon } from "@/components/store/ContentIcon";
import type { AboutContact } from "@/components/store/AboutSections";
import type { AboutSection } from "@/validations/about-sections";
import { toPersianDigits } from "@/lib/format";
import styles from "./ServicesSections.module.css";

function Button({
  value,
  secondary = false,
  text = false,
  support = false,
}: {
  value: AboutSection["button"];
  secondary?: boolean;
  text?: boolean;
  support?: boolean;
}) {
  return value?.enabled && value.href ? (
    <Link
      href={value.href}
      className={
        text ? styles.textLink : secondary ? styles.secondary : styles.primary
      }
    >
      {support && <Headphones size={20} />}
      {value.label}
      {!support &&
        !text &&
        (secondary ? <ArrowDown size={18} /> : <ArrowLeft size={18} />)}
    </Link>
  ) : null;
}
export function ServicesSections({
  sections,
  contact,
  preview = false,
}: {
  sections: AboutSection[];
  contact: AboutContact;
  preview?: boolean;
}) {
  return (
    <div className={styles.page}>
      {sections
        .filter((s) => preview || s.isActive !== false)
        .map((s, index) => {
          const items = (s.items ?? []).filter(
            (item) => preview || item.isActive,
          );
          const type = s.template ?? "story";
          const heading = (
            <>
              <p className={styles.eyebrow}>{s.eyebrow}</p>
              <h2>{s.title}</h2>
            </>
          );
          const buttons = (
            <>
              <Button value={s.button} support={type === "introduction"} />
              <Button
                value={s.secondaryButton}
                secondary
                text={type === "story"}
              />
            </>
          );
          const settings = s.contact;
          const details = settings?.useStore ? contact : settings;
          return (
            <section
              key={s.id ?? index}
              id={s.id}
              data-template={type}
              className={`${type === "introduction" ? styles.hero : type === "story" ? styles.orderPanel : type === "faq" ? styles.faqSection : type === "contact" ? styles.contact : styles.section} ${s.imagePosition === "start" ? styles.imageFirst : ""}`}
            >
              {type === "introduction" ? (
                <>
                  <div className={styles.heroCopy}>
                    <p className={styles.eyebrow}>
                      <Snowflake size={18} />
                      {s.eyebrow}
                    </p>
                    <h1>
                      {s.title}
                      {s.titleAccent && (
                        <>
                          <br />
                          <span>{s.titleAccent}</span>
                        </>
                      )}
                    </h1>
                    <p className={styles.lead}>{s.description}</p>
                    <div className={styles.actions}>{buttons}</div>
                    {s.note && (
                      <p className={styles.heroNote}>
                        <Check size={16} />
                        {s.note}
                      </p>
                    )}
                  </div>
                  {s.imageUrl && (
                    <div className={styles.visual}>
                      <div className={styles.visualGlow} aria-hidden="true" />
                      <Image
                        src={s.imageUrl}
                        alt={s.imageAlt || s.title}
                        width={560}
                        height={560}
                        sizes="(max-width: 767px) 85vw, 40vw"
                        className={styles.product}
                        unoptimized
                      />
                      {s.captionTitle && (
                        <div className={styles.visualBadge}>
                          <ShieldCheck size={28} />
                          <span>
                            <strong>{s.captionTitle}</strong>
                            <small>{s.captionDescription}</small>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : type === "values" ? (
                <>
                  {heading}
                  {s.description && (
                    <p className={styles.lead}>{s.description}</p>
                  )}
                  <div className={styles.cards}>
                    {items.map((item) => (
                      <article key={item.id} className={styles.card}>
                        <div className={styles.cardTop}>
                          <span className={styles.icon}>
                            <ContentIcon name={item.icon} size={25} />
                          </span>
                          <span className={styles.tag}>{item.label}</span>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        {item.button?.enabled && item.button.href && (
                          <Link
                            href={item.button.href}
                            className={styles.textLink}
                          >
                            {item.button.label}
                            <ArrowLeft size={17} />
                          </Link>
                        )}
                      </article>
                    ))}
                  </div>
                </>
              ) : type === "story" ? (
                <>
                  <span className={styles.orderIcon}>
                    <ClipboardList size={34} />
                  </span>
                  <div>
                    {heading}
                    <p>{s.description}</p>
                    {s.imageUrl && (
                      <Image
                        src={s.imageUrl}
                        alt={s.imageAlt || s.title}
                        width={560}
                        height={350}
                        className={styles.product}
                        unoptimized
                      />
                    )}
                  </div>
                  <div className={styles.orderActions}>{buttons}</div>
                </>
              ) : type === "steps" ? (
                <div className={styles.guideLayout}>
                  <div>
                    {heading}
                    <p className={styles.lead}>{s.description}</p>
                    {s.button?.enabled && (
                      <Link href={s.button.href} className={styles.textLink}>
                        {s.button.label}
                        <ArrowLeft size={18} />
                      </Link>
                    )}
                  </div>
                  <div className={styles.guides}>
                    {s.panelTitle && <h3>{s.panelTitle}</h3>}
                    {items.map((item, i) => (
                      <details
                        key={item.id}
                        id={`guide-${item.id}`}
                        className={styles.details}
                        open={s.openFirst && i === 0 ? true : undefined}
                      >
                        <summary>
                          <ContentIcon name={item.icon} size={21} />
                          <span>{item.title}</span>
                          <span className={styles.plus} aria-hidden="true">
                            +
                          </span>
                        </summary>
                        <ul>
                          {item.description
                            .split("\n")
                            .filter(Boolean)
                            .map((tip, j) => (
                              <li key={j}>{tip}</li>
                            ))}
                        </ul>
                      </details>
                    ))}
                    {s.panelNote && (
                      <p className={styles.lead}>{s.panelNote}</p>
                    )}
                  </div>
                </div>
              ) : type === "faq" ? (
                <>
                  {heading}
                  {s.description && (
                    <p className={styles.lead}>{s.description}</p>
                  )}
                  <div className={styles.faq}>
                    {items.map((item, i) => (
                      <details
                        className={styles.details}
                        key={item.id}
                        open={s.openFirst && i === 0 ? true : undefined}
                      >
                        <summary>
                          <span>{item.title}</span>
                          <span className={styles.plus} aria-hidden="true">
                            +
                          </span>
                        </summary>
                        <p>{item.description}</p>
                      </details>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className={styles.eyebrow}>
                      <Headphones size={19} />
                      {s.eyebrow}
                    </p>
                    <h2>{s.title}</h2>
                    <p>{s.description}</p>
                    {(s.button?.enabled || s.secondaryButton?.enabled) && (
                      <div className={styles.actions}>{buttons}</div>
                    )}
                    {s.note && <p>{s.note}</p>}
                  </div>
                  <address className={styles.contactLinks}>
                    {settings?.showPhone && details?.phone && (
                      <a href={"tel:" + details.phone}>
                        <Phone size={21} />
                        <span>
                          <small>تماس با پشتیبانی</small>
                          <bdi>{toPersianDigits(details.phone)}</bdi>
                        </span>
                        <ArrowLeft size={18} />
                      </a>
                    )}
                    {settings?.showEmail && details?.email && (
                      <a href={"mailto:" + details.email}>
                        <Mail size={21} />
                        <span>
                          <small>ایمیل پشتیبانی</small>
                          <bdi>{details.email}</bdi>
                        </span>
                        <ArrowLeft size={18} />
                      </a>
                    )}
                    {settings?.showAddress && details?.address && (
                      <p>{details.address}</p>
                    )}
                  </address>
                </>
              )}
            </section>
          );
        })}
    </div>
  );
}
