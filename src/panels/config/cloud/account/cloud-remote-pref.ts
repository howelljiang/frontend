import { mdiContentCopy, mdiHelpCircle } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
// eslint-disable-next-line
import { formatDate } from "../../../../common/datetime/format_date";
import type { HaSwitch } from "../../../../components/ha-switch";
import {
  CloudStatusLoggedIn,
  connectCloudRemote,
  disconnectCloudRemote,
  updateCloudPref,
} from "../../../../data/cloud";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { showCloudCertificateDialog } from "../dialog-cloud-certificate/show-dialog-cloud-certificate";
import { showAlertDialog } from "../../../lovelace/custom-card-helpers";

@customElement("cloud-remote-pref")
export class CloudRemotePref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  protected render() {
    if (!this.cloudStatus) {
      return nothing;
    }

    const { remote_enabled, remote_allow_remote_enable, strict_connection } =
      this.cloudStatus.prefs;

    const {
      remote_connected,
      remote_domain,
      remote_certificate,
      remote_certificate_status,
    } = this.cloudStatus;

    if (!remote_certificate || remote_certificate_status !== "ready") {
      return html`
        <ha-card
          outlined
          header=${this.hass.localize(
            "ui.panel.config.cloud.account.remote.title"
          )}
        >
          <div class="preparing">
            ${remote_certificate_status === "error"
              ? this.hass.localize(
                  "ui.panel.config.cloud.account.remote.cerificate_error"
                )
              : remote_certificate_status === "loading"
                ? this.hass.localize(
                    "ui.panel.config.cloud.account.remote.cerificate_loading"
                  )
                : remote_certificate_status === "loaded"
                  ? this.hass.localize(
                      "ui.panel.config.cloud.account.remote.cerificate_loaded"
                    )
                  : this.hass.localize(
                      "ui.panel.config.cloud.account.remote.access_is_being_prepared"
                    )}
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card
        outlined
        header=${this.hass.localize(
          "ui.panel.config.cloud.account.remote.title"
        )}
      >
        <div class="header-actions">
          <a
            href="https://www.nabucasa.com/config/remote/"
            target="_blank"
            rel="noreferrer"
            class="icon-link"
          >
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.remote.link_learn_how_it_works"
              )}
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
          <ha-switch
            .checked=${remote_enabled}
            @change=${this._toggleChanged}
          ></ha-switch>
        </div>

        <div class="card-content">
          ${!remote_connected && remote_enabled
            ? html`
                <ha-alert
                  .title=${this.hass.localize(
                    `ui.panel.config.cloud.account.remote.reconnecting`
                  )}
                ></ha-alert>
              `
            : ""}
          ${this.hass.localize("ui.panel.config.cloud.account.remote.info")}
          ${this.hass.localize(
            `ui.panel.config.cloud.account.remote.${
              remote_connected
                ? "instance_is_available"
                : "instance_will_be_available"
            }`
          )}
          <a
            href="https://${remote_domain}"
            target="_blank"
            class="break-word"
            rel="noreferrer"
            >${this.hass.localize(
              "ui.panel.config.cloud.account.remote.nabu_casa_url"
            )}</a
          >.
          <ha-svg-icon
            .url=${`https://${remote_domain}`}
            @click=${this._copyURL}
            .path=${mdiContentCopy}
          ></ha-svg-icon>
          <ha-expansion-panel
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.cloud.account.remote.advanced_options"
            )}
          >
            <ha-settings-row>
              <span slot="heading"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.external_activation"
                )}</span
              >
              <span slot="description"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.external_activation_secondary"
                )}</span
              >
              <ha-switch
                .checked=${remote_allow_remote_enable}
                @change=${this._toggleAllowRemoteEnabledChanged}
              ></ha-switch>
            </ha-settings-row>
            <ha-settings-row>
              <span slot="heading"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.strict_connection"
                )}</span
              >
              <span slot="description"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.strict_connection_secondary"
                )}</span
              >
              <ha-select
                .label=${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.strict_connection_mode"
                )}
                @selected=${this._setStrictConnectionMode}
                naturalMenuWidth
                .value=${strict_connection}
              >
                <ha-list-item value="disabled">
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.remote.strict_connection_modes.disabled"
                  )}
                </ha-list-item>
                <ha-list-item value="guard_page">
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.remote.strict_connection_modes.guard_page"
                  )}
                </ha-list-item>
                <ha-list-item value="drop_connection">
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.remote.strict_connection_modes.drop_connection"
                  )}
                </ha-list-item>
              </ha-select>
            </ha-settings-row>
            ${strict_connection !== "disabled"
              ? html` <ha-settings-row>
                  <span slot="heading"
                    >${this.hass.localize(
                      "ui.panel.config.cloud.account.remote.strict_connection_link"
                    )}</span
                  >
                  <span slot="description"
                    >${this.hass.localize(
                      "ui.panel.config.cloud.account.remote.strict_connection_link_secondary"
                    )}</span
                  >
                  <ha-button @click=${this._createLoginUrl}
                    >${this.hass.localize(
                      "ui.panel.config.cloud.account.remote.strict_connection_create_link"
                    )}</ha-button
                  >
                </ha-settings-row>`
              : nothing}
            <ha-settings-row>
              <span slot="heading"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.certificate_info"
                )}</span
              >
              <span slot="description"
                >${this.cloudStatus!.remote_certificate
                  ? this.hass.localize(
                      "ui.panel.config.cloud.account.remote.certificate_expire",
                      {
                        date: formatDate(
                          new Date(
                            this.cloudStatus.remote_certificate.expire_date
                          ),
                          this.hass.locale,
                          this.hass.config
                        ),
                      }
                    )
                  : nothing}</span
              >
              <ha-button @click=${this._openCertInfo}>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.more_info"
                )}
              </ha-button>
            </ha-settings-row>
          </ha-expansion-panel>
        </div>
      </ha-card>
    `;
  }

  private _openCertInfo() {
    showCloudCertificateDialog(this, {
      certificateInfo: this.cloudStatus!.remote_certificate!,
    });
  }

  private async _toggleChanged(ev) {
    const toggle = ev.target as HaSwitch;

    try {
      if (toggle.checked) {
        await connectCloudRemote(this.hass);
      } else {
        await disconnectCloudRemote(this.hass);
      }
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  private async _toggleAllowRemoteEnabledChanged(ev) {
    const toggle = ev.target as HaSwitch;

    try {
      await updateCloudPref(this.hass, {
        remote_allow_remote_enable: toggle.checked,
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  private async _setStrictConnectionMode(ev) {
    const mode = ev.target.value;
    try {
      await updateCloudPref(this.hass, {
        strict_connection: mode,
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(err.message);
    }
  }

  private async _copyURL(ev): Promise<void> {
    const url = ev.currentTarget.url;
    await copyToClipboard(url);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private async _createLoginUrl() {
    try {
      const result = await this.hass.callService(
        "cloud",
        "create_temporary_strict_connection_url",
        undefined,
        undefined,
        false,
        true
      );
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.cloud.account.remote.strict_connection_link"
        ),
        text: html`${this.hass.localize(
            "ui.panel.config.cloud.account.remote.strict_connection_link_created_message"
          )}
          <pre>${result.response.url}</pre>
          <ha-button
            .url=${result.response.url}
            @click=${this._copyURL}
            unelevated
          >
            <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.cloud.account.remote.strict_connection_copy_link"
            )}
          </ha-button>`,
      });
    } catch (err: any) {
      showAlertDialog(this, { text: err.message });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .preparing {
        padding: 0 16px 16px;
      }
      a {
        color: var(--primary-color);
      }
      .header-actions {
        position: absolute;
        right: 24px;
        inset-inline-end: 24px;
        inset-inline-start: initial;
        top: 24px;
        display: flex;
        flex-direction: row;
      }
      .header-actions .icon-link {
        margin-top: -16px;
        margin-right: 8px;
        margin-inline-end: 8px;
        margin-inline-start: initial;
        direction: var(--direction);
        color: var(--secondary-text-color);
      }
      .warning {
        font-weight: bold;
        margin-bottom: 1em;
      }
      .break-word {
        overflow-wrap: break-word;
      }
      .connection-status {
        position: absolute;
        right: 24px;
        top: 24px;
        inset-inline-end: 24px;
        inset-inline-start: initial;
      }
      .card-actions {
        display: flex;
      }
      .card-actions a {
        text-decoration: none;
      }
      ha-svg-icon {
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
        cursor: pointer;
      }
      ha-formfield {
        margin-top: 8px;
      }
      ha-expansion-panel {
        margin-top: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-remote-pref": CloudRemotePref;
  }
}
