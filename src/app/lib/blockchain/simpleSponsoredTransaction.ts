import {
    // callerAbi,
    contractAbi,
    // callerAddress,
    contractAddress,
} from "./contract.js";
import { walletClient, sponsoredAccount, sponsor } from "./config.js";
import { encodeFunctionData } from "viem";

// TODO make smart contract pay for the gas fees

const authorization = await walletClient.signAuthorization({
    account: sponsoredAccount,
    contractAddress,
    sponsor: true,
});

// bruh not at all what I need
// const hash = await walletClient.writeContract({
//     //   account: sponsor,
//     abi: contractAbi,
//     address: walletClient.account.address,
//     functionName: "setMessage",
//     args: ["AAAA"],
//     authorizationList: [authorization],
// });

// Copies the code of the contractAddress into the "to" account
// Sponsored by the sponsor
// const hash = await walletClient.sendTransaction({
//     account: sponsor,
//     to: walletClient.account.address,
// data: encodeFunctionData({
//     abi: callerAbi,
//     functionName: "execute",
//     args: [
//         {
//             data: encodeFunctionData({
//                 abi: contractAbi,
//                 functionName: "setMessage",
//                 args: ["wesh"]
//             }),
//             to: contractAddress
//         }
//     ],
// }),
//     // authorizationList: [authorization],
// })

const hash = await walletClient.sendTransaction({
    account: sponsor,
    authorizationList: [authorization],
    data: encodeFunctionData({
        abi: contractAbi,
        functionName: "setMessage",
        args: ["wesh"],
    }),
    to: sponsoredAccount.address,
});
