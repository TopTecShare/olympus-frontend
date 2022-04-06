import { t, Trans } from "@lingui/macro";
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  SvgIcon,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Icon, Token } from "@olympusdao/component-library";
import { BigNumber, ethers } from "ethers";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { ReactComponent as DownIcon } from "src/assets/icons/arrow-down.svg";
import { ReactComponent as ZapperIcon } from "src/assets/icons/powered-by-zapper.svg";
import { ReactComponent as FirstStepIcon } from "src/assets/icons/step-1.svg";
import { ReactComponent as SecondStepIcon } from "src/assets/icons/step-2.svg";
import { ReactComponent as CompleteStepIcon } from "src/assets/icons/step-complete.svg";
import { useApproveToken } from "src/components/TokenAllowanceGuard/hooks/useApproveToken";
import { NetworkId } from "src/constants";
import { ZAP_ADDRESSES } from "src/constants/addresses";
import { trim } from "src/helpers";
import { trackGAEvent } from "src/helpers/analytics";
import { DecimalBigNumber } from "src/helpers/DecimalBigNumber/DecimalBigNumber";
import { useWeb3Context } from "src/hooks";
import { useGohmBalance, useSohmBalance } from "src/hooks/useBalance";
import { useContractAllowance } from "src/hooks/useContractAllowance";
import { useGohmPrice, useOhmPrice } from "src/hooks/usePrices";
import { useTestableNetworks } from "src/hooks/useTestableNetworks";
import { useZapExecute } from "src/hooks/useZapExecute";
import { useZapTokenBalances } from "src/hooks/useZapTokenBalances";
import { error } from "src/slices/MessagesSlice";

import SelectTokenModal from "./SelectTokenModal";
import SlippageModal from "./SlippageModal";
import ZapStakeHeader from "./ZapStakeHeader";

const DISABLE_ZAPS = false;

const iconStyle = { height: "24px", width: "24px", zIndex: 1 };
const viewBox = "-8 -12 48 48";
const buttonIconStyle = { height: "16px", width: "16px", marginInline: "6px" };

const DECIMAL_PLACES_SHOWN = 2;

const formatBalance = (balance?: DecimalBigNumber) =>
  balance?.toString({ decimals: DECIMAL_PLACES_SHOWN, trim: false, format: true });

const useStyles = makeStyles(theme => ({
  ApprovedButton: {
    backgroundColor: theme.palette.type === "light" ? "#9EC4AB !important" : "#92A799 !important",
  },
  ApprovedText: {
    color: theme.palette.type === "light" ? "#fff" : "#333333",
  },
}));

type ZapQuantity = string | number | null;

const ZapStakeAction: React.FC = () => {
  const { address, networkId } = useWeb3Context();

  const dispatch = useDispatch();
  const classes = useStyles();

  const zapTokenBalances = useZapTokenBalances();
  const tokensBalance = zapTokenBalances.data?.balances;
  const zapExecute = useZapExecute();

  const [outputGOHM, setOutputGOHM] = useState<boolean | null>(null);
  const handleSelectOutputToken = (token: string) => {
    if (token === "gOHM") {
      setOutputGOHM(true);
    } else if (token === "sOHM") {
      setOutputGOHM(false);
    }
    setZapTokenQuantity(inputQuantity);
    handleOutputClose();
  };

  const [zapToken, setZapToken] = useState<string | null>(null);
  const handleSelectZapToken = (token: string) => {
    const uaData = {
      type: "OlyZaps Token Select",
      token: token,
      address: address,
    };
    trackGAEvent({
      category: "OlyZaps",
      action: uaData.type,
      label: uaData.token ?? "unknown",
    });
    setZapToken(token);
    handleClose();
  };

  useEffect(() => {
    if (zapToken == null || !tokensBalance || !tokensBalance[zapToken]) {
      setZapToken(null);
    }
  }, [tokensBalance, zapToken]);

  useEffect(() => {
    if (networkId !== NetworkId.MAINNET)
      dispatch(error(t`Zaps are only available on Ethereum Mainnet. Please switch networks.`));
  }, [dispatch, networkId]);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const handleOpen = () => {
    setModalOpen(true);
  };
  const handleClose = () => setModalOpen(false);

  const [outputModalOpen, setOutputModalOpen] = useState(false);
  const handleOutputOpen = () => setOutputModalOpen(true);
  const handleOutputClose = () => setOutputModalOpen(false);

  const [slippageModalOpen, setSlippageModalOpen] = useState(false);
  const handleSlippageModalOpen = () => setSlippageModalOpen(true);
  const handleSlippageModalClose = () => setSlippageModalOpen(false);

  const [inputQuantity, setInputQuantity] = useState("");
  const [outputQuantity, setOutputQuantity] = useState("");

  const olyZapsSwapOfferDisplay = (outputQuantity: Partial<string | number>) => {
    const uaData = {
      type: "OlyZaps Offer Display",
      token: zapToken,
      minOutput: outputQuantity,
    };
    trackGAEvent({
      category: "OlyZaps",
      action: uaData.type ?? "unknown",
      label: zapToken ?? "unknown",
    });
  };

  const ohmMarketPrice = useOhmPrice();
  const gOhmMarketPrice = useGohmPrice();

  const networks = useTestableNetworks();
  const sOhmBalance = useSohmBalance()[networks.MAINNET].data;
  const gOhmBalance = useGohmBalance()[networks.MAINNET].data;

  // TODO use DecimalBigNumber
  const exchangeRate = useMemo(() => {
    if (zapToken && tokensBalance && ohmMarketPrice.data && gOhmMarketPrice.data) {
      return (
        (outputGOHM === undefined || outputGOHM === null || outputGOHM ? gOhmMarketPrice.data : ohmMarketPrice.data) /
        tokensBalance[zapToken]?.price
      );
    } else {
      return Number.MAX_VALUE;
    }
  }, [zapToken, outputGOHM, tokensBalance, ohmMarketPrice, gOhmMarketPrice]);

  useEffect(() => setZapTokenQuantity(inputQuantity), [exchangeRate, inputQuantity]);

  const setZapTokenQuantity = (q: ZapQuantity) => {
    if (q == null || q === "") {
      setInputQuantity("");
      setOutputQuantity("");
      return;
    }
    setInputQuantity(q.toString());
    setOutputQuantity((+q / exchangeRate).toString());
    if (outputQuantity) {
      olyZapsSwapOfferDisplay(outputQuantity);
    }
  };

  const setOutputTokenQuantity = (q: ZapQuantity) => {
    if (q == null || q === "") {
      setInputQuantity("");
      setOutputQuantity("");
      return;
    }
    setOutputQuantity(q.toString());
    setInputQuantity((+q * exchangeRate).toString());
  };

  useEffect(() => setZapTokenQuantity(null), [zapToken]);

  const inputTokenImages = useMemo(() => {
    if (tokensBalance) {
      return Object.entries(tokensBalance)
        .filter(token => token[0] !== "sohm" && !token[1].hide)
        .sort((tokenA, tokenB) => tokenB[1].balanceUSD - tokenA[1].balanceUSD)
        .map(token => token[1].tokenImageUrl)
        .slice(0, 3);
    } else {
      return [];
    }
  }, [tokensBalance]);

  const zapTokenIsEth = useMemo(() => {
    return tokensBalance && zapToken && tokensBalance[zapToken].address === ethers.constants.AddressZero;
  }, [tokensBalance, zapToken]);

  // If ETH is selected, don't pass it through (since we don't request a token allowance)
  // And if zapToken is not yet set, don't pass it through either
  // useContractAllowance will return null if no token is given
  const { data: tokenAllowance } = useContractAllowance(
    tokensBalance && zapToken && !zapTokenIsEth ? { [NetworkId.MAINNET]: tokensBalance[zapToken].address } : {},
    ZAP_ADDRESSES,
  );

  /**
   * Indicates whether there is currently a token allowed for the selected token, `zapToken`
   */
  const hasTokenAllowance = useMemo(() => {
    if (zapTokenIsEth) return ethers.constants.MaxUint256;

    return tokenAllowance && tokenAllowance.gt(BigNumber.from(0));
  }, [tokenAllowance, zapTokenIsEth]);

  const approveMutation = useApproveToken(
    tokensBalance && zapToken ? { [NetworkId.MAINNET]: tokensBalance[zapToken].address } : {},
    ZAP_ADDRESSES,
  );

  const onSeekApproval = async () => {
    approveMutation.mutate();
  };

  const downIcon = <SvgIcon component={DownIcon} viewBox={viewBox} style={iconStyle}></SvgIcon>;

  const zapperCredit = (
    <Box display="flex" alignItems="center" justifyContent="center" paddingTop="32px" width="100%">
      <SvgIcon component={ZapperIcon} viewBox="85 0 100 80" style={{ width: "200px", height: "40px" }} />
    </Box>
  );

  const [customSlippage, setCustomSlippage] = useState<string>("1.0");

  // Number(outputQuantity) * (1 - +customSlippage / 100)
  const minimumAmount: DecimalBigNumber = new DecimalBigNumber(outputQuantity).mul(
    new DecimalBigNumber((1 - +customSlippage / 100).toString(), 9),
  );
  const minimumAmountString = minimumAmount.toString({ decimals: 4, trim: true });

  const onZap = async () => {
    if (zapToken && outputGOHM != null && tokensBalance) {
      zapExecute.mutate({
        slippage: customSlippage,
        sellAmount: ethers.utils.parseUnits(inputQuantity, tokensBalance[zapToken]?.decimals),
        tokenAddress: tokensBalance[zapToken]?.address,
        minimumAmount: minimumAmountString,
        gOHM: outputGOHM,
      });
    }
  };

  return (
    <>
      <ZapStakeHeader images={inputTokenImages} />

      <Typography>
        <Trans>You Pay</Trans>
      </Typography>
      <FormControl className="zap-input" variant="outlined" color="primary">
        <InputLabel htmlFor="amount-input"></InputLabel>
        {zapToken != null ? (
          <OutlinedInput
            id="zap-amount-input"
            type="number"
            placeholder="Enter Amount"
            className="zap-input"
            disabled={zapToken == null}
            value={inputQuantity}
            onChange={e => setZapTokenQuantity(e.target.value)}
            //   labelWidth={0}
            //   label="Hello"
            endAdornment={
              <InputAdornment position="end">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minWidth: "50px",
                  }}
                >
                  <Box flexDirection="column" display="flex">
                    <Box flexDirection="row" display="flex" alignItems="center" justifyContent="flex-end">
                      <ButtonBase onClick={handleOpen}>
                        <Avatar
                          src={tokensBalance && tokensBalance[zapToken]?.tokenImageUrl}
                          style={{ height: "30px", width: "30px" }}
                        />
                        <Box width="10px" />
                        <Typography>{tokensBalance && tokensBalance[zapToken]?.symbol}</Typography>
                        {downIcon}
                      </ButtonBase>
                    </Box>

                    <Box height="5px" />
                    <Box flexDirection="row" display="flex" alignItems="center">
                      <Typography color="textSecondary">{`Balance ${trim(
                        tokensBalance && tokensBalance[zapToken]?.balance,
                        2,
                      )}`}</Typography>
                      <Box width="10px" />
                      <ButtonBase
                        onClick={() => setZapTokenQuantity(tokensBalance ? tokensBalance[zapToken]?.balanceRaw : null)}
                      >
                        <Typography>
                          <b>Max</b>
                        </Typography>
                      </ButtonBase>
                    </Box>
                  </Box>
                </div>
              </InputAdornment>
            }
          />
        ) : (
          <Box className="zap-input">
            <Button variant="contained" className="zap-input" onClick={handleOpen} color="primary">
              <Box flexDirection="row" display="flex" alignItems="center" justifyContent="end" flexGrow={1}>
                <Typography>
                  <Trans>Select Token</Trans>
                </Typography>
                {downIcon}
              </Box>
            </Button>
          </Box>
        )}
      </FormControl>
      <Box minHeight="24px" display="flex" justifyContent="center" alignItems="center" width="100%">
        {downIcon}
      </Box>

      <Typography>
        <Trans>You Get</Trans>
      </Typography>
      <FormControl className="zap-input" variant="outlined" color="primary">
        <InputLabel htmlFor="amount-input"></InputLabel>
        {outputGOHM == null ? (
          <Box className="zap-input">
            <Button
              variant="contained"
              className="zap-input"
              onClick={handleOutputOpen}
              color="primary"
              disabled={zapToken == null}
            >
              <Box flexDirection="row" display="flex" alignItems="center" justifyContent="end" flexGrow={1}>
                <Typography>
                  <Trans>Select Token</Trans>
                </Typography>
                {downIcon}
              </Box>
            </Button>
          </Box>
        ) : (
          <OutlinedInput
            id="zap-amount-output"
            type="number"
            placeholder="Enter Amount"
            className="zap-input"
            value={outputQuantity}
            disabled={zapToken == null}
            onChange={e => setOutputTokenQuantity(e.target.value)}
            labelWidth={0}
            endAdornment={
              <InputAdornment position="end">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minWidth: "50px",
                  }}
                >
                  <Box flexDirection="column" display="flex">
                    <Box flexDirection="row" display="flex" alignItems="center" justifyContent="flex-end">
                      <ButtonBase onClick={handleOutputOpen}>
                        <Token name={outputGOHM ? "wsOHM" : "sOHM"} />
                        <Box width="10px" />
                        <Typography>{outputGOHM ? "gOHM" : "sOHM"}</Typography>
                        {downIcon}
                      </ButtonBase>
                    </Box>
                    <Box flexDirection="row" display="flex" alignItems="center">
                      <Typography color="textSecondary">{`Balance ${formatBalance(
                        outputGOHM ? gOhmBalance : sOhmBalance,
                      )}`}</Typography>
                    </Box>
                  </Box>
                </div>
              </InputAdornment>
            }
          />
        )}
      </FormControl>
      <Box
        justifyContent="space-between"
        flexDirection="row"
        display="flex"
        width="100%"
        marginY="4px"
        alignItems="center"
      >
        <Typography>
          <Trans>Slippage Tolerance</Trans>
        </Typography>
        <Box display="flex" alignItems="center">
          <Typography>{customSlippage}%</Typography>
          <Box width="8px" />
          <IconButton name="settings" onClick={handleSlippageModalOpen} className="zap-settings-icon">
            <Icon name="settings" className="zap-settings-icon" />
          </IconButton>
        </Box>
      </Box>
      <Box justifyContent="space-between" flexDirection="row" display="flex" width="100%" marginY="8px">
        <Typography>
          <Trans>Exchange Rate</Trans>
        </Typography>
        <Typography>
          {zapToken == null || outputGOHM == null || !tokensBalance
            ? "nil"
            : `${trim(exchangeRate, 4)} ${tokensBalance[zapToken]?.symbol}`}{" "}
          = 1 {outputGOHM ? "gOHM" : "sOHM"}
        </Typography>
      </Box>
      <Box
        justifyContent="space-between"
        flexDirection="row"
        display="flex"
        marginTop="8px"
        marginBottom="36px"
        width="100%"
      >
        <Typography>
          <Trans>Minimum You Get</Trans>
        </Typography>
        <Typography>
          {minimumAmountString} {outputGOHM ? "gOHM" : "sOHM"}
        </Typography>
      </Box>
      {hasTokenAllowance ? (
        <Button
          fullWidth
          className="zap-stake-button"
          variant="contained"
          color="primary"
          disabled={
            zapToken == null ||
            outputGOHM == null ||
            zapExecute.isLoading ||
            outputQuantity === "" ||
            // We cannot pass a minimum amount of 0 to the mutation, so catch it here
            minimumAmountString === "0" ||
            DISABLE_ZAPS ||
            (+outputQuantity < 0.5 && !outputGOHM)
          }
          onClick={onZap}
        >
          {zapExecute.isLoading ? (
            <Trans>Pending...</Trans>
          ) : outputQuantity === "" || minimumAmountString === "0" ? (
            <Trans>Enter Amount</Trans>
          ) : +outputQuantity >= 0.5 || outputGOHM ? (
            <Trans>Zap-Stake</Trans>
          ) : (
            <Trans>Minimum Output Amount: 0.5</Trans>
          )}
        </Button>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              className="zap-stake-button"
              variant="contained"
              color="primary"
              disabled={
                zapToken == null ||
                outputGOHM == null ||
                zapTokenBalances.isLoading ||
                approveMutation.isLoading ||
                DISABLE_ZAPS
              }
              onClick={onSeekApproval}
              classes={approveMutation.isSuccess ? { disabled: classes.ApprovedButton } : {}}
            >
              {/* {txnButtonText(pendingTransactions, approveTxnName, "Approve")} */}
              <Box display="flex" flexDirection="row">
                {approveMutation.isSuccess ? (
                  <>
                    <SvgIcon component={CompleteStepIcon} style={buttonIconStyle} viewBox={"0 0 18 18"} />
                    <Typography classes={{ root: classes.ApprovedText }}>
                      <Trans>Approved</Trans>
                    </Typography>
                  </>
                ) : (
                  <>
                    <SvgIcon component={FirstStepIcon} style={buttonIconStyle} viewBox={"0 0 16 16"} />
                    <Typography>
                      {approveMutation.isLoading ? <Trans>Pending...</Trans> : <Trans>Approve</Trans>}
                    </Typography>
                  </>
                )}
              </Box>
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              className="zap-stake-button"
              variant="contained"
              color="primary"
              disabled={
                !hasTokenAllowance ||
                zapExecute.isLoading ||
                outputQuantity === "" ||
                (+outputQuantity < 0.5 && !outputGOHM) ||
                DISABLE_ZAPS
              }
              onClick={onZap}
            >
              <Box display="flex" flexDirection="row" alignItems="center">
                <SvgIcon component={SecondStepIcon} style={buttonIconStyle} viewBox={"0 0 16 16"} />
                <Typography>
                  {outputQuantity === "" ? (
                    <Trans>Enter Amount</Trans>
                  ) : +outputQuantity >= 0.5 || outputGOHM ? (
                    <Trans>Zap-Stake</Trans>
                  ) : (
                    <Trans>Minimum Output Amount: 0.5</Trans>
                  )}
                </Typography>
              </Box>
            </Button>
          </Grid>
        </Grid>
      )}
      {zapperCredit}
      {SelectTokenModal(handleClose, modalOpen, zapTokenBalances.isLoading, handleSelectZapToken, zapperCredit, {
        regularTokens: tokensBalance,
      })}
      {SelectTokenModal(handleOutputClose, outputModalOpen, false, handleSelectOutputToken, zapperCredit, {
        output: true,
      })}
      {SlippageModal(handleSlippageModalClose, slippageModalOpen, customSlippage, setCustomSlippage, zapperCredit)}
    </>
  );
};

export default ZapStakeAction;
